import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getConfig } from "@/lib/config";

function createAuth() {
  const config = getConfig();
  return betterAuth({
    appName: "市场部工作看板",
    baseURL: config.BETTER_AUTH_URL,
    secret: config.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    rateLimit: { enabled: false },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 60 * 60 * 8,
      updateAge: 60 * 30,
      cookieCache: { enabled: false },
    },
    user: {
      additionalFields: {
        organizationId: { type: "string", required: true, input: false },
        role: {
          type: ["EMPLOYEE", "BOSS", "ADMIN"],
          required: true,
          input: false,
        },
        status: {
          type: ["ACTIVE", "DISABLED"],
          required: true,
          input: false,
        },
      },
    },
    advanced: {
      useSecureCookies: config.APP_ENV !== "development",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (value) => {
            const [user] = await getDb()
              .select({ status: schema.user.status })
              .from(schema.user)
              .where(eq(schema.user.id, value.userId))
              .limit(1);
            if (!user || user.status === "DISABLED")
              throw new APIError("UNAUTHORIZED", {
                message: "无法登录，请联系管理员",
              });
            return { data: value };
          },
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (["/change-password", "/revoke-sessions"].includes(ctx.path)) {
          const current = await getAuth().api.getSession({
            headers: ctx.headers ?? new Headers(),
          });
          if (!current)
            throw new APIError("UNAUTHORIZED", { message: "请先登录" });
          const [actor] = await getDb()
            .select()
            .from(schema.user)
            .where(eq(schema.user.id, current.user.id));
          if (!actor || actor.status === "DISABLED")
            throw new APIError("FORBIDDEN", { message: "账号不可用" });
        }
        if (ctx.path === "/change-password") {
          if (ctx.body?.currentPassword === ctx.body?.newPassword)
            throw new APIError("BAD_REQUEST", {
              message: "新密码必须与当前密码不同",
            });
          ctx.body = { ...ctx.body, revokeOtherSessions: true };
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        const returned = ctx.context.returned;
        if (
          ctx.path !== "/change-password" ||
          !returned ||
          typeof returned !== "object" ||
          !("user" in returned) ||
          returned instanceof APIError ||
          !ctx.context.session
        )
          return;
        const current = ctx.context.session;
        await getDb().transaction(async (tx) => {
          await tx
            .delete(schema.session)
            .where(
              and(
                eq(schema.session.userId, current.user.id),
                ne(schema.session.id, current.session.id),
              ),
            );
          const [actor] = await tx
            .select({ organizationId: schema.user.organizationId })
            .from(schema.user)
            .where(eq(schema.user.id, current.user.id));
          await tx.insert(schema.auditLog).values({
            id: crypto.randomUUID(),
            organizationId: actor.organizationId,
            actorId: current.user.id,
            action: "PASSWORD_CHANGED",
            resourceType: "USER",
            resourceId: current.user.id,
            result: "SUCCESS",
          });
        });
      }),
    },
    plugins: [username()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (instance ??= createAuth());
}
