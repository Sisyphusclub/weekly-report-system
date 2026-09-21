import { and, asc, eq } from "drizzle-orm";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { getDb } from "@/lib/db";
import {
  auditLog,
  blocker,
  blockerComment,
  notification,
  user,
} from "@/lib/db/schema";
import { z } from "zod";
import { mentionedUsernames } from "@/lib/comment-input";
const input = z.object({
  body: z.string().trim().min(1).max(5000),
  parentId: z.string().uuid().nullable().optional(),
});
async function access(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  id: string,
  actor: Awaited<ReturnType<typeof writeActor>>,
) {
  const [item] = await tx
    .select({
      id: blocker.id,
      reporterId: blocker.reporterId,
      coordinatorId: blocker.coordinatorId,
      isSensitive: blocker.isSensitive,
    })
    .from(blocker)
    .where(
      and(eq(blocker.id, id), eq(blocker.organizationId, actor.organizationId)),
    )
    .limit(1);
  if (!item) throw new BusinessError("阻塞不存在", 404);
  if (
    item.isSensitive &&
    actor.role !== "BOSS" &&
    actor.id !== item.reporterId &&
    actor.id !== item.coordinatorId
  )
    throw new BusinessError("无权查看该阻塞", 403);
  return item;
}
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await writeActor(_);
    const id = (await params).id;
    const db = getDb();
    await access(db, id, actor);
    const items = await db
      .select({
        id: blockerComment.id,
        body: blockerComment.body,
        authorName: user.name,
        authorId: blockerComment.authorId,
        createdAt: blockerComment.createdAt,
        deletedAt: blockerComment.deletedAt,
        parentId: blockerComment.parentId,
      })
      .from(blockerComment)
      .innerJoin(user, eq(user.id, blockerComment.authorId))
      .where(
        and(
          eq(blockerComment.organizationId, actor.organizationId),
          eq(blockerComment.blockerId, id),
        ),
      )
      .orderBy(asc(blockerComment.createdAt));
    return Response.json({
      items: items.map((x) => (x.deletedAt ? { ...x, body: "评论已删除" } : x)),
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await writeActor(request);
    if (actor.role === "BOSS")
      throw new BusinessError("老板账号仅可查看阻塞评论", 403);
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new BusinessError("评论内容无效");
    const id = (await params).id;
    const result = await getDb().transaction(async (tx) => {
      await access(tx, id, actor);
      if (parsed.data.parentId) {
        const [parent] = await tx
          .select({ id: blockerComment.id })
          .from(blockerComment)
          .where(
            and(
              eq(blockerComment.id, parsed.data.parentId),
              eq(blockerComment.organizationId, actor.organizationId),
              eq(blockerComment.blockerId, id),
            ),
          )
          .limit(1);
        if (!parent) throw new BusinessError("回复目标不存在", 404);
      }
      const commentId = crypto.randomUUID();
      await tx.insert(blockerComment).values({
        id: commentId,
        organizationId: actor.organizationId,
        blockerId: id,
        authorId: actor.id,
        body: parsed.data.body,
        parentId: parsed.data.parentId ?? null,
      });
      const names = mentionedUsernames(parsed.data.body);
      if (names.length) {
        const recipients = await tx
          .select({ id: user.id, username: user.username })
          .from(user)
          .where(
            and(
              eq(user.organizationId, actor.organizationId),
              eq(user.status, "ACTIVE"),
            ),
          );
        const valid = recipients.filter(
          (item) =>
            names.includes(item.username.toLowerCase()) && item.id !== actor.id,
        );
        if (valid.length)
          await tx
            .insert(notification)
            .values(
              valid.map((item) => ({
                id: crypto.randomUUID(),
                organizationId: actor.organizationId,
                recipientId: item.id,
                dedupeKey: `blocker-comment:${commentId}:${item.id}`,
                type: "COMMENT_MENTIONED",
                title: "有人在阻塞评论中提及你",
                link: `/blockers/${id}`,
              })),
            )
            .onConflictDoNothing();
      }
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "BLOCKER_COMMENT_CREATE",
        resourceType: "BLOCKER",
        resourceId: id,
        result: "SUCCESS",
      });
      return { id: commentId };
    });
    return Response.json(result, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
