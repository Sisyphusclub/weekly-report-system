import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { auditLog, user } from "@/lib/db/schema";
import { WorkspaceShell } from "@/components/workspace/shell";
import { Input } from "@/components/base/input/input";
import { Button, ButtonLink } from "@/components/base/buttons/button";

export const metadata = { title: "审计日志" };
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; resourceId?: string }>;
}) {
  const actor = await requireUser();
  if (actor.role !== "ADMIN") notFound();
  const params = await searchParams;
  const n = Number(params.page ?? 1);
  const page = Number.isSafeInteger(n) && n > 0 ? Math.min(n, 100000) : 1;
  const resourceId =
    typeof params.resourceId === "string"
      ? params.resourceId.trim().slice(0, 200)
      : "";
  const rows = await getDb()
    .select({ item: auditLog, name: user.name })
    .from(auditLog)
    .innerJoin(
      user,
      and(
        eq(user.id, auditLog.actorId),
        eq(user.organizationId, actor.organizationId),
      ),
    )
    .where(
      and(
        eq(auditLog.organizationId, actor.organizationId),
        resourceId ? eq(auditLog.resourceId, resourceId) : undefined,
      ),
    )
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(21)
    .offset((page - 1) * 20);
  const href = (value: number) =>
    `/admin/audit?${new URLSearchParams({ page: String(value), resourceId })}`;
  const time = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    dateStyle: "medium",
    timeStyle: "medium",
  });
  return (
    <WorkspaceShell actor={actor} selected="audit">
      <h1 className="text-title-1-medium">审计日志</h1>
      <form action="/admin/audit" className="flex flex-wrap items-end gap-3">
        <Input
          name="resourceId"
          label="资源 ID"
          defaultValue={resourceId}
          maxLength={200}
        />
        <Button type="submit">查询</Button>
        <ButtonLink href="/admin/audit" variant="ghost">
          重置
        </ButtonLink>
      </form>
      {rows.length ? (
        <ol className="divide-y divide-separator-border rounded-3xl border border-border-button-default">
          {rows.slice(0, 20).map(({ item, name }) => (
            <li key={item.id} className="flex flex-col gap-2 p-5">
              <p className="text-body-medium">
                {name} · {item.action} ·{" "}
                {item.result === "SUCCESS" ? "成功" : item.result}
              </p>
              <p className="break-all text-body-regular text-text-secondary">
                {item.resourceType} · {item.resourceId}
              </p>
              <time
                dateTime={item.createdAt.toISOString()}
                className="text-body-regular text-text-secondary"
              >
                {time.format(item.createdAt)}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p>没有符合条件的审计记录</p>
      )}
      <nav
        aria-label="审计日志分页"
        className="flex flex-wrap items-center gap-3"
      >
        {page > 1 && (
          <ButtonLink href={href(page - 1)} variant="secondary">
            上一页
          </ButtonLink>
        )}
        <span>第 {page} 页</span>
        {rows.length > 20 && (
          <ButtonLink href={href(page + 1)} variant="secondary">
            下一页
          </ButtonLink>
        )}
      </nav>
    </WorkspaceShell>
  );
}
