import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { user, auditLog } from "@/lib/db/schema";

export async function guardUsernameLogin(
  request: Request,
  handle: () => Promise<Response>,
) {
  const body: unknown = await request
    .clone()
    .json()
    .catch(() => null);
  if (
    !body ||
    typeof body !== "object" ||
    !("username" in body) ||
    typeof body.username !== "string" ||
    body.username.length > 30
  )
    return handle();
  const username = body.username.trim().toLowerCase();
  return getDb().transaction(async (tx) => {
    // Reject simultaneous attempts instead of holding connections while waiting.
    const lock = await tx.execute<{ acquired: boolean }>(
      sql`SELECT pg_try_advisory_xact_lock(hashtextextended(${username}, 12345)) AS acquired`,
    );
    if (!lock.rows[0].acquired)
      return Response.json({ message: "请稍后重试" }, { status: 429 });
    const [actor] = await tx
      .select({
        id: user.id,
        organizationId: user.organizationId,
        failures: user.failedLoginCount,
        lockedUntil: user.loginLockedUntil,
      })
      .from(user)
      .where(eq(user.username, username))
      .limit(1);
    const now = new Date();
    if (actor?.lockedUntil && actor.lockedUntil > now)
      return Response.json(
        { message: "登录暂时锁定，请稍后重试" },
        { status: 429 },
      );
    const response = await handle();
    if (
      actor &&
      (response.ok || response.status === 401 || response.status === 422)
    ) {
      const failures = response.ok
        ? 0
        : (actor.lockedUntil ? 0 : actor.failures) + 1;
      await tx
        .update(user)
        .set({
          failedLoginCount: failures,
          loginLockedUntil:
            failures >= 5 ? new Date(now.getTime() + 900000) : null,
        })
        .where(eq(user.id, actor.id));
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "PASSWORD_AUTHENTICATION",
        resourceType: "USER",
        resourceId: actor.id,
        result: response.ok ? "SUCCESS" : "FAILURE",
      });
    }
    return response;
  });
}
