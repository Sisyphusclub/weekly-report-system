import { and, eq, isNull } from "drizzle-orm";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { getDb } from "@/lib/db";
import { auditLog, blockerComment } from "@/lib/db/schema";
import { z } from "zod";
const bodyInput = z.string().trim().min(1).max(5000);
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const actor = await writeActor(request);
    if (actor.role === "BOSS")
      throw new BusinessError("老板账号仅可查看阻塞评论", 403);
    const { id, commentId } = await params;
    const payload = await request.json().catch(() => null);
    const deleted = payload?.deleted === true;
    const parsed = deleted ? null : bodyInput.safeParse(payload?.body);
    if (!deleted && !parsed?.success) throw new BusinessError("评论内容无效");
    await getDb().transaction(async (tx) => {
      const [item] = await tx
        .select({ id: blockerComment.id })
        .from(blockerComment)
        .where(
          and(
            eq(blockerComment.id, commentId),
            eq(blockerComment.blockerId, id),
            eq(blockerComment.organizationId, actor.organizationId),
            eq(blockerComment.authorId, actor.id),
            isNull(blockerComment.deletedAt),
          ),
        )
        .limit(1)
        .for("update");
      if (!item) throw new BusinessError("评论不存在或无权修改", 404);
      const now = new Date();
      await tx
        .update(blockerComment)
        .set(
          deleted
            ? { deletedAt: now, updatedAt: now }
            : { body: parsed!.data, updatedAt: now },
        )
        .where(eq(blockerComment.id, commentId));
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: deleted ? "BLOCKER_COMMENT_DELETE" : "BLOCKER_COMMENT_UPDATE",
        resourceType: "BLOCKER",
        resourceId: id,
        result: "SUCCESS",
      });
    });
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
