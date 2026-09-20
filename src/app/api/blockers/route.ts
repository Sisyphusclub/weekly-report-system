import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getConfig } from "@/lib/config";
import { currentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { blocker, notification, user, auditLog } from "@/lib/db/schema";

const schema = z.object({
  description: z.string().trim().min(1).max(5000),
  severity: z.enum(["NORMAL", "IMPORTANT", "URGENT"]),
  isSensitive: z.boolean().default(false),
});
export async function POST(request: Request) {
  try {
    if (
      request.headers.get("origin") !==
      new URL(getConfig().BETTER_AUTH_URL).origin
    )
      return Response.json({ error: "请求来源无效" }, { status: 403 });
    const actor = await currentUser();
    if (!actor || actor.role === "ADMIN")
      return Response.json({ error: "请先登录" }, { status: 403 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return Response.json({ error: "请填写有效的阻塞描述" }, { status: 400 });
    const id = crypto.randomUUID();
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.insert(blocker).values({
        id,
        organizationId: actor.organizationId,
        reporterId: actor.id,
        severity: parsed.data.severity,
        description: parsed.data.description,
        isSensitive: parsed.data.isSensitive,
      });
      const bosses = await tx
        .select({ id: user.id })
        .from(user)
        .where(
          and(
            eq(user.organizationId, actor.organizationId),
            eq(user.role, "BOSS"),
            eq(user.status, "ACTIVE"),
          ),
        );
      for (const boss of bosses)
        if (boss.id !== actor.id)
          await tx
            .insert(notification)
            .values({
              id: crypto.randomUUID(),
              organizationId: actor.organizationId,
              recipientId: boss.id,
              dedupeKey: `blocker:${id}`,
              type: "BLOCKER_CREATED",
              title: "收到新的阻塞事项",
              link: `/blockers/${id}`,
            })
            .onConflictDoNothing();
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "BLOCKER_CREATE",
        resourceType: "blocker",
        resourceId: id,
        result: "SUCCESS",
      });
    });
    return Response.json({ id }, { status: 201 });
  } catch {
    console.error("Blocker creation failed");
    return Response.json(
      { error: "保存失败，请保留内容并稍后重试" },
      { status: 500 },
    );
  }
}
