import { and, eq, isNull } from "drizzle-orm";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { getDb } from "@/lib/db";
import { auditLog, taskComment } from "@/lib/db/schema";
import { z } from "zod";
const bodyInput = z.string().trim().min(1).max(5000);
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await writeActor(request);
    const id = (await params).id;
    const payload = await request.json().catch(() => null);
    const deleted = payload?.deleted === true;
    const parsed = deleted ? null : bodyInput.safeParse(payload?.body);
    if (!deleted && !parsed?.success) throw new BusinessError("评论内容无效");
    await getDb().transaction(async (tx) => {
      const [item] = await tx
        .select({ id: taskComment.id })
        .from(taskComment)
        .where(
          and(
            eq(taskComment.id, id),
            eq(taskComment.organizationId, actor.organizationId),
            eq(taskComment.authorId, actor.id),
            isNull(taskComment.deletedAt),
          ),
        )
        .limit(1)
        .for("update");
      if (!item) throw new BusinessError("评论不存在或无权修改", 404);
      const now = new Date();
      await tx
        .update(taskComment)
        .set(
          deleted
            ? { deletedAt: now, updatedAt: now }
            : { body: parsed!.data, updatedAt: now },
        )
        .where(eq(taskComment.id, id));
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: deleted ? "TASK_COMMENT_DELETE" : "TASK_COMMENT_UPDATE",
        resourceType: "TASK_COMMENT",
        resourceId: id,
        result: "SUCCESS",
      });
    });
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
