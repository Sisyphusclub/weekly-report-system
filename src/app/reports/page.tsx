import { z } from "zod";
import { reportFilter, reportFilterParams } from "@/lib/report-filter";
import { requireUser } from "@/lib/access";
import { listReports, PAGE_SIZE } from "@/lib/reports";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ButtonLink } from "@/components/motion/button/base";
import { CopyFilterLink } from "@/components/workspace/copy-filter-link";
import { ReportFilters } from "@/components/workspace/report-filters";
import { ReportResultsTable } from "@/components/workspace/report-results-table";
import { getDb } from "@/lib/db";
import { user, project, category } from "@/lib/db/schema";
import { and, asc, eq, ne } from "drizzle-orm";

export const metadata = { title: "报告查询" };
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireUser();
  const params = await searchParams;
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(100000)
    .catch(1)
    .parse(params.page);
  const query =
    typeof params.q === "string" ? params.q.trim().slice(0, 200) : "";
  const parsedDates = reportFilter.safeParse({
    from: params.from,
    to: params.to,
    member: params.member,
    status: params.status,
    type: params.type,
    project: params.project,
    category: params.category,
    taskStatus: params.taskStatus,
    blocked: params.blocked,
  });
  const dates = parsedDates.success ? parsedDates.data : {};
  const result = parsedDates.success
    ? await listReports(actor, query, page, dates)
    : { items: [], total: 0 };
  const href = (value: number) =>
    `/reports?${reportFilterParams(query, dates, value)}`;
  const db = getDb();
  const members =
    actor.role === "ADMIN"
      ? [{ id: actor.id, name: actor.name }]
      : await db
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(
            and(
              eq(user.organizationId, actor.organizationId),
              ne(user.role, "ADMIN"),
            ),
          )
          .orderBy(asc(user.name), asc(user.id));
  const [projects, categories] = await Promise.all([
    db
      .select({ id: project.id, name: project.name })
      .from(project)
      .where(
        and(
          eq(project.organizationId, actor.organizationId),
          ne(project.status, "ARCHIVED"),
        ),
      )
      .orderBy(asc(project.name), asc(project.id)),
    db
      .select({ id: category.id, name: category.name })
      .from(category)
      .where(
        and(
          eq(category.organizationId, actor.organizationId),
          eq(category.enabled, true),
        ),
      )
      .orderBy(asc(category.sortOrder), asc(category.name), asc(category.id)),
  ]);
  return (
    <WorkspaceShell actor={actor} selected="reports">
      <header>
        <h1 className="text-title-1-medium">
          {actor.role === "ADMIN" ? "我的报告" : "报告查询"}
        </h1>
        <p className="mt-2 text-body-regular text-text-secondary">
          共 {result.total} 份可查看的报告
        </p>
      </header>
      <ReportFilters
        key={reportFilterParams(query, dates)}
        query={query}
        filters={dates}
        members={members}
        projects={projects}
        categories={categories}
      />
      {parsedDates.success && (
        <>
          <ButtonLink
            href={`/api/reports/export?${reportFilterParams(query, dates)}`}
            variant="secondary"
          >
            导出 JSON
          </ButtonLink>
          <CopyFilterLink href={href(1)} />
        </>
      )}
      {!parsedDates.success && (
        <p role="alert">筛选条件无效，请重新选择后查询。</p>
      )}
      <ReportResultsTable
        rows={result.items.map((item) => ({
          id: item.id,
          type: item.type,
          status: item.status,
          date: item.date,
          weekStart: item.weekStart,
          summary: item.summary ?? "",
          author: item.author,
          wasLate: item.wasLate,
          revisionNumber: item.revisionNumber,
        }))}
      />
      <footer className="flex items-center justify-between">
        <span className="text-body-regular text-text-secondary">
          第 {page} 页 · 每页 {PAGE_SIZE} 份
        </span>
        <div className="flex gap-3">
          {page > 1 && (
            <ButtonLink href={href(page - 1)} variant="secondary">
              上一页
            </ButtonLink>
          )}
          {page * PAGE_SIZE < result.total && (
            <ButtonLink href={href(page + 1)} variant="secondary">
              下一页
            </ButtonLink>
          )}
        </div>
      </footer>
    </WorkspaceShell>
  );
}

