import { and, asc, eq } from "drizzle-orm";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { mentionedUsernames } from "@/lib/comment-input";
import { getDb } from "@/lib/db";
import {
  auditLog,
  notification,
  taskComment,
  user,
  workTask,
} from "@/lib/db/schema";
import { z } from "zod";
const input = z.object({
  taskId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
});
export async function GET(request: Request) {
  try {
    const actor = await writeActor(request);
    const taskId = new URL(request.url).searchParams.get("taskId");
    if (!taskId) throw new BusinessError("任务编号无效");
    const [task] = await getDb()
      .select({ id: workTask.id })
      .from(workTask)
      .where(
        and(
          eq(workTask.id, taskId),
          eq(workTask.organizationId, actor.organizationId),
          actor.role === "EMPLOYEE"
            ? eq(workTask.primaryAssigneeId, actor.id)
            : undefined,
        ),
      )
      .limit(1);
    if (!task) throw new BusinessError("任务不存在或无权查看", 404);
    const items = await getDb()
      .select({
        id: taskComment.id,
        body: taskComment.body,
        createdAt: taskComment.createdAt,
        deletedAt: taskComment.deletedAt,
        authorName: user.name,
      })
      .from(taskComment)
      .innerJoin(user, eq(taskComment.authorId, user.id))
      .where(
        and(
          eq(taskComment.organizationId, actor.organizationId),
          eq(taskComment.taskId, taskId),
        ),
      )
      .orderBy(asc(taskComment.createdAt));
    return Response.json({
      items: items.map((item) =>
        item.deletedAt ? { ...item, body: "评论已删除" } : item,
      ),
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new BusinessError("评论内容无效");
    const v = parsed.data;
    const result = await getDb().transaction(async (tx) => {
      const [task] = await tx
        .select({ id: workTask.id })
        .from(workTask)
        .where(
          and(
            eq(workTask.id, v.taskId),
            eq(workTask.organizationId, actor.organizationId),
            actor.role === "EMPLOYEE"
              ? eq(workTask.primaryAssigneeId, actor.id)
              : undefined,
          ),
        )
        .limit(1);
      if (!task) throw new BusinessError("任务不存在或无权评论", 404);
      const usernames = mentionedUsernames(v.body);
      const mentioned = usernames.length
        ? await tx
            .select({ id: user.id, username: user.username })
            .from(user)
            .where(
              and(
                eq(user.organizationId, actor.organizationId),
                eq(user.status, "ACTIVE"),
              ),
            )
        : [];
      const valid = mentioned.filter(
        (item) =>
          usernames.includes(item.username.toLowerCase()) &&
          item.id !== actor.id,
      );
      const id = crypto.randomUUID();
      await tx.insert(taskComment).values({
        id,
        organizationId: actor.organizationId,
        taskId: v.taskId,
        authorId: actor.id,
        body: v.body,
        mentions: valid.map((item) => item.username),
      });
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "TASK_COMMENT_CREATE",
        resourceType: "TASK",
        resourceId: v.taskId,
        result: "SUCCESS",
      });
      if (valid.length)
        await tx
          .insert(notification)
          .values(
            valid.map((item) => ({
              id: crypto.randomUUID(),
              organizationId: actor.organizationId,
              recipientId: item.id,
              dedupeKey: `task-comment:${id}:${item.id}`,
              type: "COMMENT_MENTIONED",
              title: "有人在任务评论中提及你",
              link: `/tasks?task=${v.taskId}`,
            })),
          )
          .onConflictDoNothing();
      return { id };
    });
    return Response.json(result, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
