import { and, desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { notification } from "@/lib/db/schema";
import { WorkspaceShell } from "@/components/workspace/shell";
import { NotificationList } from "@/components/workspace/notification-list";
export const metadata = { title: "通知中心" };
export default async function NotificationsPage() {
  const actor = await requireUser();
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
  return (
    <WorkspaceShell actor={actor} selected="notifications">
      <h1 className="text-title-1-medium">通知中心</h1>
      <NotificationList items={items} />
    </WorkspaceShell>
  );
}
