import { z } from "zod";
import { reportFilter, reportFilterParams } from "@/lib/report-filter";
import { requireUser } from "@/lib/access";
import { listReports, PAGE_SIZE } from "@/lib/reports";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ButtonLink } from "@/components/base/buttons/button";
import { CopyFilterLink } from "@/components/workspace/copy-filter-link";
import { ReportFilters } from "@/components/workspace/report-filters";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema";
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
  });
  const dates = parsedDates.success ? parsedDates.data : {};
  const result = parsedDates.success
    ? await listReports(actor, query, page, dates)
    : { items: [], total: 0 };
  const href = (value: number) =>
    `/reports?${reportFilterParams(query, dates, value)}`;
  const members =
    actor.role === "ADMIN"
      ? [{ id: actor.id, name: actor.name }]
      : await getDb()
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(
            and(
              eq(user.organizationId, actor.organizationId),
              ne(user.role, "ADMIN"),
            ),
          )
          .orderBy(asc(user.name), asc(user.id));
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
      <section className="rounded-3xl border border-border-button-default p-6">
        {result.items.length ? (
          <ul className="divide-y divide-separator-border">
            {result.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div>
                  <h2 className="text-headline-medium">
                    {item.author} · {item.type === "DAILY" ? "日报" : "周报"} ·{" "}
                    {item.date ?? item.weekStart}
                  </h2>
                  <p className="mt-2 text-body-regular text-text-secondary">
                    {item.status === "DRAFT"
                      ? "本人草稿"
                      : `已提交 · 版本 ${item.revisionNumber}`}
                    {item.wasLate ? " · 曾逾期" : ""}
                  </p>
                  <p className="mt-2 break-words text-body-regular">
                    {item.summary || "未填写总结"}
                  </p>
                </div>
                <ButtonLink href={`/reports/${item.id}`} variant="secondary">
                  查看
                </ButtonLink>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-10 text-center">
            <h2 className="text-headline-medium">没有符合条件的报告</h2>
            <p className="mt-2 text-body-regular text-text-secondary">
              可以尝试其他关键词，或等待团队提交报告。
            </p>
          </div>
        )}
      </section>
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
