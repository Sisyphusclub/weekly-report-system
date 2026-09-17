import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq, sql } from "drizzle-orm";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { createUserInput } from "@/lib/user-input";
import { getDb } from "@/lib/db";
import { user, account, auditLog } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role !== "ADMIN")
      throw new BusinessError("仅管理员可创建账号", 403);
    const parsed = createUserInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) throw new BusinessError("请检查用户名、姓名和角色");
    const input = parsed.data;
    const temporaryPassword = randomBytes(24).toString("base64url");
    const password = await hashPassword(temporaryPassword);
    const id = crypto.randomUUID();
    await getDb().transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`username:${input.username}`}, 0))`,
      );
      const [existing] = await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.username, input.username))
        .limit(1);
      if (existing) throw new BusinessError("用户名已被使用", 409);
      await tx.insert(user).values({
        id,
        organizationId: actor.organizationId,
        ...input,
        displayUsername: input.username,
        email: `${id}@accounts.invalid`,
        status: "PENDING",
        mustChangePassword: true,
      });
      await tx.insert(account).values({
        id: crypto.randomUUID(),
        userId: id,
        accountId: id,
        providerId: "credential",
        password,
      });
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "USER_CREATED",
        resourceType: "USER",
        resourceId: id,
        result: "SUCCESS",
      });
    });
    return Response.json(
      { id, username: input.username, temporaryPassword },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
