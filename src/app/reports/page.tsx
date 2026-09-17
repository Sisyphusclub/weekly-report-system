import { z } from "zod";
import { reportFilter } from "@/lib/report-filter";
import { requireUser } from "@/lib/access";
import { listReports, PAGE_SIZE } from "@/lib/reports";
import { WorkspaceShell } from "@/components/workspace/shell";
import { Input } from "@/components/base/input/input";
import { Button, ButtonLink } from "@/components/base/buttons/button";

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
  });
  const dates = parsedDates.success ? parsedDates.data : {};
  const result = parsedDates.success
    ? await listReports(actor, query, page, dates)
    : { items: [], total: 0 };
  const href = (value: number) =>
    `/reports?${new URLSearchParams({ q: query, from: dates.from ?? "", to: dates.to ?? "", page: String(value) })}`;
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
      <form action="/reports" className="flex flex-wrap items-end gap-3">
        <Input
          name="q"
          label="搜索报告总结"
          defaultValue={query}
          placeholder="输入关键词"
          maxLength={200}
        />
        <Button type="submit">搜索</Button>
        <Input
          name="from"
          type="date"
          label="开始日期"
          defaultValue={typeof params.from === "string" ? params.from : ""}
        />
        <Input
          name="to"
          type="date"
          label="结束日期"
          defaultValue={typeof params.to === "string" ? params.to : ""}
        />
      </form>
      <ButtonLink
        href={`/api/reports/export?${new URLSearchParams({ q: query, from: dates.from ?? "", to: dates.to ?? "" })}`}
        variant="secondary"
      >
        导出 JSON
      </ButtonLink>
      {!parsedDates.success && (
        <p role="alert">日期范围无效，请检查开始和结束日期。</p>
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
