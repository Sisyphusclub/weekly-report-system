import { and, count, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { currentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { notification } from "@/lib/db/schema";
export async function GET(request: Request) {
  try {
    const actor = await currentUser();
    if (!actor) return Response.json({ error: "请先登录" }, { status: 401 });
    if (
      actor.mustChangePassword ||
      (actor.role !== "EMPLOYEE" && !actor.twoFactorEnabled)
    )
      throw new BusinessError("请先完成账号安全设置", 403);
    const params = new URL(request.url).searchParams;
    const limit = Number(params.get("limit") ?? 20);
    const offset = Number(params.get("offset") ?? 0);
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 1000000
    )
      throw new BusinessError("分页参数无效");
    const items = await getDb()
      .select({
        id: notification.id,
        title: notification.title,
        type: notification.type,
        link: notification.link,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
      })
      .from(notification)
      .where(
        and(
          eq(notification.organizationId, actor.organizationId),
          eq(notification.recipientId, actor.id),
        ),
      )
      .orderBy(desc(notification.createdAt), desc(notification.id))
      .limit(limit)
      .offset(offset);
    const [unread] = await getDb()
      .select({ value: count() })
      .from(notification)
      .where(
        and(
          eq(notification.organizationId, actor.organizationId),
          eq(notification.recipientId, actor.id),
          isNull(notification.readAt),
        ),
      );
    return Response.json(
      {
        items,
        unread: unread.value,
        limit,
        offset,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof BusinessError) return apiError(error);
    console.error("Notification query failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "通知加载失败，请稍后重试" },
      { status: 500 },
    );
  }
}
export async function PATCH(request: Request) {
  try {
    const actor = await writeActor(request);
    const parsed = z
      .object({ id: z.string().uuid() })
      .safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new BusinessError("通知 ID 无效");
    const body = parsed.data;
    const changed = await getDb()
      .update(notification)
      .set({ readAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(notification.id, body.id),
          eq(notification.organizationId, actor.organizationId),
          eq(notification.recipientId, actor.id),
          isNull(notification.readAt),
        ),
      )
      .returning({ id: notification.id });
    if (!changed.length) {
      const [existing] = await getDb()
        .select({ id: notification.id })
        .from(notification)
        .where(
          and(
            eq(notification.id, body.id),
            eq(notification.organizationId, actor.organizationId),
            eq(notification.recipientId, actor.id),
          ),
        )
        .limit(1);
      if (!existing) throw new BusinessError("通知不存在", 404);
    }
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
