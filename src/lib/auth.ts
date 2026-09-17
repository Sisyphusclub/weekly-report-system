import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor, username } from "better-auth/plugins";
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
          type: ["PENDING", "ACTIVE", "LOCKED", "DISABLED"],
          required: true,
          input: false,
        },
        mustChangePassword: {
          type: "boolean",
          required: true,
          defaultValue: true,
          input: false,
        },
      },
    },
    advanced: {
      useSecureCookies: config.APP_ENV !== "development",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/username": { window: 900, max: 5 },
        "/two-factor/*": { window: 60, max: 5 },
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (value) => {
            const [user] = await getDb()
              .select({
                status: schema.user.status,
                lockedUntil: schema.user.loginLockedUntil,
              })
              .from(schema.user)
              .where(eq(schema.user.id, value.userId))
              .limit(1);
            if (
              !user ||
              ["DISABLED", "LOCKED"].includes(user.status) ||
              (user.lockedUntil && user.lockedUntil > new Date())
            )
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
        if (
          [
            "/change-password",
            "/two-factor/enable",
            "/revoke-sessions",
          ].includes(ctx.path)
        ) {
          const current = await getAuth().api.getSession({
            headers: ctx.headers ?? new Headers(),
          });
          if (!current)
            throw new APIError("UNAUTHORIZED", { message: "请先登录" });
          const [actor] = await getDb()
            .select()
            .from(schema.user)
            .where(eq(schema.user.id, current.user.id));
          if (!actor || ["DISABLED", "LOCKED"].includes(actor.status))
            throw new APIError("FORBIDDEN", { message: "账号不可用" });
          if (ctx.path === "/two-factor/enable" && actor.mustChangePassword)
            throw new APIError("FORBIDDEN", { message: "请先修改临时密码" });
        }
        if (ctx.path === "/change-password") {
          if (ctx.body?.currentPassword === ctx.body?.newPassword)
            throw new APIError("BAD_REQUEST", {
              message: "新密码必须与当前密码不同",
            });
          ctx.body = { ...ctx.body, revokeOtherSessions: true };
        }
        if (
          ctx.path === "/two-factor/verify-totp" ||
          ctx.path === "/two-factor/verify-backup-code"
        )
          ctx.body = { ...ctx.body, trustDevice: false };
      }),
      after: createAuthMiddleware(async (ctx) => {
        const returned = ctx.context.returned;
        if (
          ctx.path === "/two-factor/verify-totp" &&
          returned &&
          typeof returned === "object" &&
          "user" in returned &&
          ctx.context.newSession &&
          ctx.context.session &&
          !ctx.context.session.user.twoFactorEnabled
        ) {
          const verified = ctx.context.newSession;
          await getDb()
            .delete(schema.session)
            .where(
              and(
                eq(schema.session.userId, verified.user.id),
                ne(schema.session.id, verified.session.id),
              ),
            );
        }
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
            .update(schema.user)
            .set({
              mustChangePassword: false,
              status: "ACTIVE",
              updatedAt: new Date(),
            })
            .where(eq(schema.user.id, current.user.id));
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
    plugins: [
      username(),
      twoFactor({
        issuer: "市场部工作看板",
        accountLockout: {
          enabled: true,
          maxFailedAttempts: 5,
          durationSeconds: 900,
        },
      }),
    ],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (instance ??= createAuth());
}
