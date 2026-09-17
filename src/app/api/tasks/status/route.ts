import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { getDb } from "@/lib/db";
import { auditLog, workTask } from "@/lib/db/schema";

const inputSchema = z.object({
  taskId: z.string().uuid(),
  version: z.number().int().positive(),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELED"]),
});
export async function PATCH(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role === "ADMIN")
      throw new BusinessError("管理员不能修改业务任务", 403);
    const parsed = inputSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) throw new BusinessError("任务状态或版本无效");
    const input = parsed.data;
    const result = await getDb().transaction(async (tx) => {
      const [task] = await tx
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
      if (!task) throw new BusinessError("任务不存在", 404);
      if (actor.role !== "BOSS" && task.primaryAssigneeId !== actor.id)
        throw new BusinessError("只能修改自己的任务", 403);
      if (task.version !== input.version)
        throw new BusinessError("任务已更新，请刷新后重试", 409);
      if (task.status === input.status)
        return { id: task.id, version: task.version, status: task.status };
      const [updated] = await tx
        .update(workTask)
        .set({
          status: input.status,
          version: task.version + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(workTask.id, task.id),
            eq(workTask.organizationId, actor.organizationId),
            eq(workTask.version, input.version),
          ),
        )
        .returning({
          id: workTask.id,
          version: workTask.version,
          status: workTask.status,
        });
      if (!updated) throw new BusinessError("任务已更新，请刷新后重试", 409);
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: `TASK_STATUS_${task.status}_TO_${input.status}`,
        resourceType: "TASK",
        resourceId: task.id,
        result: "SUCCESS",
      });
      return updated;
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
