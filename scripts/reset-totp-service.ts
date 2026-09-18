import { and, asc, eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { auditLog, session, twoFactor, user } from "../src/lib/db/schema";

export const resetTotpInput = z
  .object({
    organizationId: z.string().min(1).max(100),
    operatorUsername: z.string().min(3).max(30),
    targetUsername: z.string().min(3).max(30),
    reason: z.string().trim().min(10).max(500),
    confirm: z.literal("RESET_TOTP"),
  })
  .strict();

// Server-console authority only. Do not expose this operation through an API.
export async function resetTotp(db: NodePgDatabase, raw: unknown) {
  const input = resetTotpInput.parse(raw);
  await db.transaction(async (tx) => {
    const accounts = await tx
      .select()
      .from(user)
      .where(
        and(
          eq(user.organizationId, input.organizationId),
          inArray(user.username, [
            input.operatorUsername,
            input.targetUsername,
          ]),
        ),
      )
      .orderBy(asc(user.id))
      .for("update");
    const operator = accounts.find(
      (account) => account.username === input.operatorUsername,
    );
    const target = accounts.find(
      (account) => account.username === input.targetUsername,
    );
    if (
      !operator ||
      operator.role !== "ADMIN" ||
      operator.status === "DISABLED"
    )
      throw new Error("OPERATOR_NOT_AVAILABLE");
    if (!target) throw new Error("TARGET_NOT_FOUND");
    const factors = await tx
      .delete(twoFactor)
      .where(eq(twoFactor.userId, target.id))
      .returning({ id: twoFactor.id });
    if (!factors.length && !target.twoFactorEnabled)
      throw new Error("TOTP_NOT_CONFIGURED");
    await tx.delete(session).where(eq(session.userId, target.id));
    await tx
      .update(user)
      .set({
        twoFactorEnabled: false,
        mustChangePassword: true,
        status: target.status === "DISABLED" ? "DISABLED" : "PENDING",
        failedLoginCount: 0,
        loginLockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, target.id));
    await tx.insert(auditLog).values({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      actorId: operator.id,
      action: "OPS_TOTP_RESET",
      resourceType: "USER",
      resourceId: target.id,
      result: "SUCCESS",
      reason: input.reason,
    });
  });
}
