import { and, desc, eq, isNull } from "drizzle-orm";
import { currentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { notification } from "@/lib/db/schema";
export async function GET() {
  const actor = await currentUser();
  if (!actor) return Response.json({ error: "请先登录" }, { status: 401 });
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
    .orderBy(desc(notification.createdAt))
    .limit(100);
  return Response.json({
    items,
    unread: items.filter((item) => !item.readAt).length,
  });
}
export async function PATCH(request: Request) {
  const actor = await currentUser();
  if (!actor) return Response.json({ error: "请先登录" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    id?: string;
  } | null;
  if (!body?.id)
    return Response.json({ error: "通知 ID 无效" }, { status: 400 });
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
  return Response.json({ ok: changed.length > 0 });
}
