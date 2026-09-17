import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { report, reportRevision, user } from "@/lib/db/schema";
import { reportVisibility } from "@/lib/reports";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ButtonLink } from "@/components/base/buttons/button";
import { ReportSnapshotView } from "@/components/workspace/report-snapshot-view";

export const metadata = { title: "报告历史版本" };
export default async function ReportHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; version?: string }>;
}) {
  const actor = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const db = getDb();
  const [item] = await db
    .select({ id: report.id, revisionNumber: report.revisionNumber })
    .from(report)
    .where(and(reportVisibility(actor), eq(report.id, id)))
    .limit(1);
  if (!item || item.revisionNumber < 1) notFound();
  const n = Number(query.page ?? 1);
  const page = Number.isSafeInteger(n) && n > 0 ? Math.min(n, 100000) : 1;
  const version = Number(query.version ?? item.revisionNumber);
  if (!Number.isSafeInteger(version) || version < 1) notFound();
  const scope = and(
    eq(reportRevision.organizationId, actor.organizationId),
    eq(reportRevision.reportId, id),
  );
  const versions = await db
    .select({
      number: reportRevision.revisionNumber,
      reason: reportRevision.reason,
      createdAt: reportRevision.createdAt,
    })
    .from(reportRevision)
    .where(scope)
    .orderBy(desc(reportRevision.revisionNumber))
    .limit(21)
    .offset((page - 1) * 20);
  const [selected] = await db
    .select({
      number: reportRevision.revisionNumber,
      editor: user.name,
      reason: reportRevision.reason,
      createdAt: reportRevision.createdAt,
      snapshot: reportRevision.snapshot,
      diff: reportRevision.diff,
    })
    .from(reportRevision)
    .innerJoin(
      user,
      and(
        eq(user.id, reportRevision.editorId),
        eq(user.organizationId, reportRevision.organizationId),
      ),
    )
    .where(and(scope, eq(reportRevision.revisionNumber, version)))
    .limit(1);
  if (!selected) notFound();
  return (
    <WorkspaceShell actor={actor} selected="reports">
      <ButtonLink
        href={`/reports/${id}`}
        variant="ghost"
        className="self-start"
      >
        返回报告
      </ButtonLink>
      <h1 className="text-title-1-medium">历史版本</h1>
      <section className="flex flex-col gap-4 rounded-3xl border border-border-button-default p-6">
        <h2 className="text-title-2-medium">版本记录</h2>
        <ul className="flex flex-col gap-3">
          {versions.slice(0, 20).map((row) => (
            <li key={row.number} className="flex flex-wrap items-center gap-3">
              <ButtonLink
                href={`/reports/${id}/history?page=${page}&version=${row.number}`}
                variant={row.number === version ? "primary" : "secondary"}
                aria-current={row.number === version ? "page" : undefined}
              >
                版本 {row.number}
              </ButtonLink>
              <span className="break-words">
                {row.reason} ·{" "}
                {row.createdAt.toLocaleString("zh-CN", {
                  timeZone: "Asia/Shanghai",
                })}
              </span>
            </li>
          ))}
        </ul>
        <nav
          aria-label="版本分页"
          className="flex flex-wrap items-center gap-3"
        >
          {page > 1 && (
            <ButtonLink
              variant="secondary"
              href={`/reports/${id}/history?page=${page - 1}&version=${version}`}
            >
              上一页
            </ButtonLink>
          )}
          <span>第 {page} 页</span>
          {versions.length > 20 && (
            <ButtonLink
              variant="secondary"
              href={`/reports/${id}/history?page=${page + 1}&version=${version}`}
            >
              下一页
            </ButtonLink>
          )}
        </nav>
      </section>
      <article className="flex flex-col gap-6 rounded-3xl border border-border-button-default p-6">
        <header className="flex flex-col gap-2">
          <h2 className="text-title-2-medium">版本 {selected.number}</h2>
          <p>
            {selected.editor} ·{" "}
            {selected.createdAt.toLocaleString("zh-CN", {
              timeZone: "Asia/Shanghai",
            })}
          </p>
          <p className="whitespace-pre-wrap break-words">
            修订原因：{selected.reason}
          </p>
        </header>
        <ReportSnapshotView snapshot={selected.snapshot} diff={selected.diff} />
      </article>
    </WorkspaceShell>
  );
}
