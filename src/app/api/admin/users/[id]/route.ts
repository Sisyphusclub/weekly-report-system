import { and, eq } from "drizzle-orm";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { getDb } from "@/lib/db";
import { auditLog, session, user } from "@/lib/db/schema";
import { z } from "zod";
const input = z.object({ status: z.enum(["ACTIVE", "DISABLED"]) });
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await writeActor(request);
    if (actor.role !== "ADMIN")
      throw new BusinessError("仅管理员可修改账号", 403);
    const { id } = await params;
    if (id === actor.id) throw new BusinessError("不能停用当前登录账号");
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new BusinessError("账号状态无效");
    await getDb().transaction(async (tx) => {
      const changed = await tx
        .update(user)
        .set({ status: parsed.data.status, updatedAt: new Date() })
        .where(
          and(eq(user.id, id), eq(user.organizationId, actor.organizationId)),
        )
        .returning({ id: user.id });
      if (!changed.length) throw new BusinessError("账号不存在", 404);
      if (parsed.data.status === "DISABLED")
        await tx.delete(session).where(eq(session.userId, id));
      await tx
        .insert(auditLog)
        .values({
          id: crypto.randomUUID(),
          organizationId: actor.organizationId,
          actorId: actor.id,
          action:
            parsed.data.status === "DISABLED"
              ? "USER_DISABLED"
              : "USER_ENABLED",
          resourceType: "USER",
          resourceId: id,
          result: "SUCCESS",
        });
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
