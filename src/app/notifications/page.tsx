import { and, desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { notification } from "@/lib/db/schema";
import { WorkspaceShell } from "@/components/workspace/shell";
import { NotificationList } from "@/components/workspace/notification-list";
import { ButtonLink } from "@/components/motion/button/base";
export const metadata = { title: "通知中心" };
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await requireUser();
  const params = await searchParams;
  const n = Number(params.page ?? 1);
  const page = Number.isSafeInteger(n) && n > 0 ? Math.min(n, 100000) : 1;
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
    .limit(21)
    .offset((page - 1) * 20);
  return (
    <WorkspaceShell actor={actor} selected="notifications">
      <h1 className="text-title-1-medium">通知中心</h1>
      <NotificationList key={page} items={items.slice(0, 20)} />
      <nav aria-label="通知分页" className="flex flex-wrap items-center gap-3">
        {page > 1 && (
          <ButtonLink
            href={`/notifications?page=${page - 1}`}
            variant="secondary"
          >
            上一页
          </ButtonLink>
        )}
        <span>第 {page} 页</span>
        {items.length > 20 && (
          <ButtonLink
            href={`/notifications?page=${page + 1}`}
            variant="secondary"
          >
            下一页
          </ButtonLink>
        )}
      </nav>
    </WorkspaceShell>
  );
}

