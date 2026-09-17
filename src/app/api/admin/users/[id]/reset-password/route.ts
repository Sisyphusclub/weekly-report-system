import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { getDb } from "@/lib/db";
import { account, auditLog, session, user } from "@/lib/db/schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await writeActor(request);
    if (actor.role !== "ADMIN")
      throw new BusinessError("仅管理员可重置密码", 403);
    const { id } = await params;
    if (id === actor.id)
      throw new BusinessError("不能通过此操作重置当前账号，请使用账号安全页面");
    const temporaryPassword = randomBytes(24).toString("base64url");
    const password = await hashPassword(temporaryPassword);
    const username = await getDb().transaction(async (tx) => {
      const [target] = await tx
        .select({ id: user.id, username: user.username, status: user.status })
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
        .set({
          mustChangePassword: true,
          status: target.status === "DISABLED" ? "DISABLED" : "PENDING",
          updatedAt: new Date(),
        })
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
      { username, temporaryPassword },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
