import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { getDb } from "@/lib/db";
import { auditLog, notification, user, workTask } from "@/lib/db/schema";

const input = z
  .object({
    fromId: z.string().min(1).max(100),
    toId: z.string().min(1).max(100),
    expectedCount: z.number().int().min(1).max(200),
    reason: z.string().trim().min(1).max(500),
  })
  .strict()
  .refine((value) => value.fromId !== value.toId);

export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role !== "ADMIN")
      throw new BusinessError("仅管理员可转交任务", 403);
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new BusinessError("请选择不同的负责人并填写转交原因");
    const { fromId, toId, expectedCount, reason } = parsed.data;
    const result = await getDb().transaction(async (tx) => {
      const people = await tx
        .select()
        .from(user)
        .where(
          and(
            eq(user.organizationId, actor.organizationId),
            inArray(user.id, [fromId, toId]),
          ),
        )
        .orderBy(asc(user.id))
        .for("update");
      const source = people.find((person) => person.id === fromId);
      const target = people.find((person) => person.id === toId);
      if (
        !source ||
        !target ||
        target.status !== "ACTIVE" ||
        target.role === "ADMIN"
      )
        throw new BusinessError("原负责人或接收人不可用，请刷新后重试", 409);
      const tasks = await tx
        .select({ id: workTask.id })
        .from(workTask)
        .where(
          and(
            eq(workTask.organizationId, actor.organizationId),
            eq(workTask.primaryAssigneeId, fromId),
            inArray(workTask.status, ["TODO", "IN_PROGRESS", "BLOCKED"]),
          ),
        )
        .orderBy(asc(workTask.id))
        .limit(200)
        .for("update");
      if (tasks.length !== expectedCount)
        throw new BusinessError("待转交任务数量已变化，请刷新后重新确认", 409);
      await tx
        .update(workTask)
        .set({
          primaryAssigneeId: toId,
          version: sql`${workTask.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(workTask.organizationId, actor.organizationId),
            inArray(
              workTask.id,
              tasks.map((task) => task.id),
            ),
          ),
        );
      await tx.insert(auditLog).values(
        tasks.map((task) => ({
          id: crypto.randomUUID(),
          organizationId: actor.organizationId,
          actorId: actor.id,
          action: "TASK_TRANSFER",
          resourceType: "TASK",
          resourceId: task.id,
          result: "SUCCESS",
          reason: JSON.stringify({ fromId, toId, reason }),
        })),
      );
      await tx.insert(notification).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        recipientId: toId,
        dedupeKey: `task-transfer:${crypto.randomUUID()}`,
        type: "TASK_TRANSFER",
        title: `已接收 ${tasks.length} 条转交任务`,
        link: "/tasks",
      });
      return { transferred: tasks.length };
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
