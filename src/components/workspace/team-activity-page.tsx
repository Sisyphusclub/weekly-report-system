import { and, desc, eq } from "drizzle-orm";
import { FileText, Users } from "lucide-react";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { report, user } from "@/lib/db/schema";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ButtonLink } from "@/components/motion/button/base";
import { Badge } from "@/components/premium/badge";

const PAGE_SIZE = 20;

export async function TeamActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await requireUser();
  const params = await searchParams;
  const parsedPage = Number(params.page ?? 1);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0
    ? Math.min(parsedPage, 100000)
    : 1;
  const rows = await getDb()
    .select({
      id: report.id,
      type: report.type,
      date: report.reportDate,
      weekStart: report.weekStart,
      summary: report.summary,
      author: user.name,
      submittedAt: report.submittedAt,
    })
    .from(report)
    .innerJoin(
      user,
      and(eq(user.id, report.authorId), eq(user.organizationId, report.organizationId)),
    )
    .where(
      and(
        eq(report.organizationId, actor.organizationId),
        eq(report.status, "SUBMITTED"),
      ),
    )
    .orderBy(desc(report.submittedAt), desc(report.id))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);
  const hasNext = rows.length > PAGE_SIZE;
  const items = rows.slice(0, PAGE_SIZE);

  return (
    <WorkspaceShell actor={actor} selected="activity">
      <header className="border-b border-border pb-5">
        <p className="text-xs font-medium text-primary">团队视角</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">团队动态</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          查看团队成员已提交的日报和周报，了解最近工作进展。
        </p>
      </header>

      {items.length ? (
        <ol className="divide-y divide-border rounded-2xl border border-border bg-background">
          {items.map((item) => {
            const date = item.date ?? item.weekStart ?? "未设置日期";
            return (
              <li key={item.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  {item.type === "DAILY" ? <FileText className="size-4" aria-hidden /> : <Users className="size-4" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">{item.author}</span>
                    <Badge tone={item.type === "DAILY" ? "blue" : "purple"}>
                      {item.type === "DAILY" ? "日报" : "周报"}
                    </Badge>
                    <time className="font-mono text-xs text-muted-foreground" dateTime={item.submittedAt?.toISOString()}>
                      {date}
                    </time>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {item.summary?.trim() || "已提交报告，未填写总结。"}
                  </p>
                </div>
                <ButtonLink href={`/reports/${item.id}`} variant="outline" size="sm" className="shrink-0 rounded-lg">
                  查看报告
                </ButtonLink>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-border bg-background px-6 text-center">
          <div>
            <p className="font-medium text-foreground">还没有团队动态</p>
            <p className="mt-1 text-sm text-muted-foreground">团队成员提交报告后，会在这里显示。</p>
          </div>
        </div>
      )}

      <nav aria-label="团队动态分页" className="flex flex-wrap items-center gap-3">
        {page > 1 && <ButtonLink href={`/activity?page=${page - 1}`} variant="secondary">上一页</ButtonLink>}
        <span className="text-sm text-muted-foreground">第 {page} 页</span>
        {hasNext && <ButtonLink href={`/activity?page=${page + 1}`} variant="secondary">下一页</ButtonLink>}
      </nav>
    </WorkspaceShell>
  );
}
