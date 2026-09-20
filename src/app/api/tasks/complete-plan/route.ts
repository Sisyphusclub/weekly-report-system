import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { getDb } from "@/lib/db";
import {
  auditLog,
  deliverable,
  taskStatusHistory,
  workTask,
} from "@/lib/db/schema";
import { shanghaiDate } from "@/lib/daily-input";

const inputSchema = z.object({
  taskId: z.string().uuid(),
  version: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role === "ADMIN")
      throw new BusinessError("管理员不能核销业务计划", 403);
    const parsed = inputSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) throw new BusinessError("计划或版本无效");

    const input = parsed.data;
    const result = await getDb().transaction(async (tx) => {
      const [source] = await tx
        .select()
        .from(workTask)
        .where(
          and(
            eq(workTask.id, input.taskId),
            eq(workTask.organizationId, actor.organizationId),
          ),
        )
        .limit(1)
        .for("update");
      if (!source) throw new BusinessError("计划不存在", 404);
      if (actor.role !== "BOSS" && source.primaryAssigneeId !== actor.id)
        throw new BusinessError("只能核销自己的计划", 403);
      if (source.kind !== "PLAN") throw new BusinessError("只能核销计划任务");

      const [existing] = await tx
        .select({
          id: workTask.id,
          version: workTask.version,
          workDate: workTask.workDate,
        })
        .from(workTask)
        .where(
          and(
            eq(workTask.organizationId, actor.organizationId),
            eq(workTask.sourceTaskId, source.id),
            eq(workTask.kind, "ACTUAL"),
          ),
        )
        .limit(1);
      if (existing?.workDate)
        return {
          id: existing.id,
          version: existing.version,
          workDate: existing.workDate,
        };

      if (source.version !== input.version)
        throw new BusinessError("计划已更新，请刷新后重试", 409);
      if (source.status === "DONE")
        throw new BusinessError("计划已完成，请刷新页面", 409);
      if (source.status === "CANCELED")
        throw new BusinessError("已取消的计划不能核销");

      const deliveries = await tx
        .select({
          unitId: deliverable.unitId,
          unitName: deliverable.unitName,
          quantity: deliverable.quantity,
        })
        .from(deliverable)
        .where(
          and(
            eq(deliverable.organizationId, actor.organizationId),
            eq(deliverable.taskId, source.id),
          ),
        );
      const actualId = crypto.randomUUID();
      const workDate = shanghaiDate();

      await tx.insert(workTask).values({
        id: actualId,
        organizationId: actor.organizationId,
        createdById: actor.id,
        primaryAssigneeId: source.primaryAssigneeId,
        projectId: source.projectId,
        categoryId: source.categoryId,
        categoryName: source.categoryName,
        content: source.content,
        kind: "ACTUAL",
        status: "DONE",
        workDate,
        dueDate: null,
        sourceTaskId: source.id,
        version: 1,
      });
      if (deliveries.length)
        await tx.insert(deliverable).values(
          deliveries.map((item) => ({
            id: crypto.randomUUID(),
            organizationId: actor.organizationId,
            taskId: actualId,
            unitId: item.unitId,
            unitName: item.unitName,
            quantity: item.quantity,
          })),
        );

      const updated = await tx
        .update(workTask)
        .set({
          status: "DONE",
          version: source.version + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(workTask.id, source.id),
            eq(workTask.organizationId, actor.organizationId),
            eq(workTask.version, input.version),
          ),
        )
        .returning({ version: workTask.version });
      if (!updated.length)
        throw new BusinessError("计划已更新，请刷新后重试", 409);

      await tx.insert(taskStatusHistory).values([
        {
          id: crypto.randomUUID(),
          organizationId: actor.organizationId,
          taskId: source.id,
          fromStatus: source.status,
          toStatus: "DONE",
          changedById: actor.id,
        },
        {
          id: crypto.randomUUID(),
          organizationId: actor.organizationId,
          taskId: actualId,
          fromStatus: null,
          toStatus: "DONE",
          changedById: actor.id,
        },
      ]);
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "PLAN_COMPLETE_TO_ACTUAL",
        resourceType: "TASK",
        resourceId: source.id,
        result: "SUCCESS",
        reason: `生成实际任务 ${actualId}`,
      });

      return { id: actualId, version: 1, workDate };
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
