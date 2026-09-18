import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { dateInput } from "@/lib/daily-input";
import { rollPlan } from "@/lib/domain";
import { getDb } from "@/lib/db";
import { auditLog, category, project, user, workTask } from "@/lib/db/schema";

const inputSchema = z.object({
  taskId: z.string().uuid(),
  version: z.number().int().positive(),
  dueDate: dateInput,
});

export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role === "ADMIN")
      throw new BusinessError("管理员不能滚动业务计划", 403);
    const parsed = inputSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) throw new BusinessError("计划日期或版本无效");
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
        throw new BusinessError("只能滚动自己的计划", 403);
      const [existing] = await tx
        .select({ id: workTask.id, version: workTask.version })
        .from(workTask)
        .where(
          and(
            eq(workTask.organizationId, actor.organizationId),
            eq(workTask.sourceTaskId, source.id),
            eq(workTask.kind, "PLAN"),
            eq(workTask.dueDate, input.dueDate),
          ),
        )
        .limit(1);
      if (existing) return existing;
      if (source.version !== input.version)
        throw new BusinessError("计划已更新，请刷新后重试", 409);
      if (source.kind !== "PLAN" || !source.dueDate)
        throw new BusinessError("只能滚动计划任务");
      const [refs] = await tx
        .select({ id: project.id })
        .from(project)
        .innerJoin(category, eq(category.id, source.categoryId))
        .innerJoin(
          user,
          and(
            eq(user.id, source.primaryAssigneeId),
            eq(user.organizationId, project.organizationId),
          ),
        )
        .where(
          and(
            eq(project.id, source.projectId),
            eq(project.organizationId, actor.organizationId),
            ne(project.status, "ARCHIVED"),
            eq(category.organizationId, actor.organizationId),
            eq(category.enabled, true),
            eq(user.organizationId, actor.organizationId),
            eq(user.status, "ACTIVE"),
            ne(user.role, "ADMIN"),
          ),
        )
        .limit(1);
      if (!refs) throw new BusinessError("项目、分类或负责人不可用");
      let next;
      try {
        next = rollPlan(
          { ...source, dueDate: source.dueDate },
          crypto.randomUUID(),
          input.dueDate,
        );
      } catch (error) {
        throw new BusinessError((error as Error).message);
      }
      await tx.insert(workTask).values({
        ...next,
        createdById: actor.id,
        version: 1,
        workDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "PLAN_ROLL",
        resourceType: "TASK",
        resourceId: next.id,
        result: "SUCCESS",
      });
      return { id: next.id, version: 1 };
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
