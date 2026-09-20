import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import {
  apiError,
  BusinessError,
  enforceRateLimit,
  writeActor,
} from "@/lib/api";
import { getDb } from "@/lib/db";
import { account, auditLog, session, user } from "@/lib/db/schema";
import { resetPasswordInput } from "@/lib/user-input";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await writeActor(request);
    if (actor.role !== "ADMIN")
      throw new BusinessError("仅管理员可重置密码", 403);
    const { id } = await params;
    enforceRateLimit(
      `password-reset:user:${actor.organizationId}:${id}`,
      5,
      60_000,
    );
    enforceRateLimit(`password-reset:org:${actor.organizationId}`, 20, 60_000);
    if (id === actor.id)
      throw new BusinessError("不能通过此操作重置当前账号，请使用账号安全页面");
    const parsed = resetPasswordInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) throw new BusinessError("新密码需为 12–128 位");
    const password = await hashPassword(parsed.data.password);
    const username = await getDb().transaction(async (tx) => {
      const [target] = await tx
        .select({ id: user.id, username: user.username })
        .from(user)
        .where(
          and(eq(user.id, id), eq(user.organizationId, actor.organizationId)),
        )
        .limit(1)
        .for("update");
      if (!target) throw new BusinessError("账号不存在", 404);
      const changedAccounts = await tx
        .update(account)
        .set({ password, updatedAt: new Date() })
        .where(
          and(eq(account.userId, id), eq(account.providerId, "credential")),
        )
        .returning({ id: account.id });
      if (!changedAccounts.length)
        throw new BusinessError("账号凭证不存在", 409);
      await tx
        .update(user)
        .set({ updatedAt: new Date() })
        .where(eq(user.id, id));
      await tx.delete(session).where(eq(session.userId, id));
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "PASSWORD_RESET",
        resourceType: "USER",
        resourceId: id,
        result: "SUCCESS",
      });
      return target.username;
    });
    return Response.json(
      { username, ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
