import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { commentInput, mentionedUsernames } from "@/lib/comment-input";
import { getDb } from "@/lib/db";
import { auditLog, comment, notification, report, user } from "@/lib/db/schema";
import { reportVisibility } from "@/lib/reports";

export async function GET(request: Request) {
  try {
    const actor = await writeActor(request);
    const reportId = new URL(request.url).searchParams.get("reportId");
    if (!reportId) throw new BusinessError("报告编号无效");
    const db = getDb();
    const [visible] = await db
      .select({ id: report.id })
      .from(report)
      .where(and(eq(report.id, reportId), reportVisibility(actor)))
      .limit(1);
    if (!visible) throw new BusinessError("报告不存在或无权查看", 404);
    const rows = await db
      .select({
        id: comment.id,
        parentId: comment.parentId,
        body: comment.body,
        mentions: comment.mentions,
        editedAt: comment.editedAt,
        deletedAt: comment.deletedAt,
        createdAt: comment.createdAt,
        authorId: comment.authorId,
        authorName: user.name,
        authorUsername: user.username,
      })
      .from(comment)
      .innerJoin(user, eq(comment.authorId, user.id))
      .where(
        and(
          eq(comment.organizationId, actor.organizationId),
          eq(comment.reportId, reportId),
        ),
      )
      .orderBy(asc(comment.createdAt), asc(comment.id));
    return Response.json({
      items: rows.map((row) =>
        row.deletedAt ? { ...row, body: "评论已删除" } : row,
      ),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    const parsed = commentInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) throw new BusinessError("评论内容无效");
    const input = parsed.data;
    const result = await getDb().transaction(async (tx) => {
      const [target] = await tx
        .select({ id: report.id })
        .from(report)
        .where(and(eq(report.id, input.reportId), reportVisibility(actor)))
        .limit(1);
      if (!target) throw new BusinessError("报告不存在或无权评论", 404);
      if (input.parentId) {
        const [parent] = await tx
          .select({ id: comment.id })
          .from(comment)
          .where(
            and(
              eq(comment.id, input.parentId),
              eq(comment.reportId, input.reportId),
              eq(comment.organizationId, actor.organizationId),
              isNull(comment.deletedAt),
            ),
          )
          .limit(1);
        if (!parent) throw new BusinessError("回复目标不存在", 404);
      }
      const usernames = mentionedUsernames(input.body);
      const mentioned = usernames.length
        ? await tx
            .select({ id: user.id, username: user.username })
            .from(user)
            .where(
              and(
                eq(user.organizationId, actor.organizationId),
                eq(user.status, "ACTIVE"),
                inArray(user.username, usernames),
              ),
            )
        : [];
      const id = crypto.randomUUID();
      await tx.insert(comment).values({
        id,
        organizationId: actor.organizationId,
        reportId: input.reportId,
        authorId: actor.id,
        parentId: input.parentId ?? null,
        body: input.body.trim(),
        mentions: mentioned.map((item) => item.username),
      });
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "COMMENT_CREATE",
        resourceType: "COMMENT",
        resourceId: id,
        result: "SUCCESS",
      });
      if (mentioned.length)
        await tx
          .insert(notification)
          .values(
            mentioned
              .filter((item) => item.id !== actor.id)
              .map((item) => ({
                id: crypto.randomUUID(),
                organizationId: actor.organizationId,
                recipientId: item.id,
                dedupeKey: `comment-mention:${id}:${item.id}`,
                type: "COMMENT_MENTIONED",
                title: "有人在报告评论中提及你",
                link: `/reports/${input.reportId}`,
              })),
          )
          .onConflictDoNothing();
      return { id };
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
