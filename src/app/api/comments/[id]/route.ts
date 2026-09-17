import { and, eq, isNull } from "drizzle-orm";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { getDb } from "@/lib/db";
import { auditLog, comment } from "@/lib/db/schema";
import { commentInput } from "@/lib/comment-input";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await writeActor(request);
    const id = (await params).id;
    const body = await request.json().catch(() => null);
    const deleted = body?.deleted === true;
    const parsed = deleted
      ? null
      : commentInput.shape.body.safeParse(body?.body);
    if (!deleted && !parsed?.success) throw new BusinessError("评论内容无效");
    await getDb().transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(comment)
        .where(
          and(
            eq(comment.id, id),
            eq(comment.organizationId, actor.organizationId),
            eq(comment.authorId, actor.id),
            isNull(comment.deletedAt),
          ),
        )
        .limit(1)
        .for("update");
      if (!item) throw new BusinessError("评论不存在或无权修改", 404);
      const now = new Date();
      await tx
        .update(comment)
        .set(
          deleted
            ? { deletedAt: now, updatedAt: now }
            : { body: parsed!.data, editedAt: now, updatedAt: now },
        )
        .where(eq(comment.id, id));
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: deleted ? "COMMENT_DELETE" : "COMMENT_UPDATE",
        resourceType: "COMMENT",
        resourceId: id,
        result: "SUCCESS",
      });
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
