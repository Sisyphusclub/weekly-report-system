import { and, eq, desc, inArray } from "drizzle-orm";
import { sourceReferences, updatedSources } from "@/lib/source-updates";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { report, reportRevision, reportTask } from "@/lib/db/schema";
import { taskSnapshot } from "@/lib/task-snapshot";
import { reportVisibility } from "@/lib/reports";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ButtonLink } from "@/components/motion/button/base";
import { Badge } from "@/components/premium/badge";
import { Card, CardBody, CardHeader } from "@/components/premium/cards/card";
import { List } from "@/components/premium/list";
import { DailyEntryList } from "@/components/workspace/daily-entry-list";
import { RevisionForm } from "@/components/workspace/revision-form";
import { RevisionRequests } from "@/components/workspace/revision-requests";
import { CommentSection } from "@/components/workspace/comment-section";
import {
  dailyBlockersSchema,
  dailyEntriesSchema,
  type DailyEntry,
} from "@/lib/daily-input";

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ requestsPage?: string }>;
}) {
  const actor = await requireUser();
  const { id } = await params;
  const requestedPage = Number((await searchParams).requestsPage ?? 1);
  const requestsPage =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, 100000)
      : 1;
  const db = getDb();
  const [item] = await db
    .select()
    .from(report)
    .where(and(reportVisibility(actor), eq(report.id, id)))
    .limit(1);
  if (!item) notFound();
  const tasks = await db
    .select({
      id: reportTask.taskId,
      snapshot: reportTask.snapshot,
      sourceReportId: reportTask.sourceReportId,
    })
    .from(reportTask)
    .where(
      and(
        eq(reportTask.organizationId, actor.organizationId),
        eq(reportTask.reportId, id),
      ),
    )
    .orderBy(reportTask.taskId);
  const dailyPlans = dailyEntriesSchema.safeParse(item.planEntries).data ?? [];
  const dailyWorks = dailyEntriesSchema.safeParse(item.workEntries).data ?? [];
  const dailyBlockers = dailyBlockersSchema.safeParse(item.blockers).data ?? [];
  const versions = await db
    .select({
      number: reportRevision.revisionNumber,
      reason: reportRevision.reason,
      at: reportRevision.createdAt,
      snapshot: reportRevision.snapshot,
    })
    .from(reportRevision)
    .where(
      and(
        eq(reportRevision.organizationId, actor.organizationId),
        eq(reportRevision.reportId, id),
      ),
    )
    .orderBy(desc(reportRevision.revisionNumber))
    .limit(20);
  const snapshot =
    item.type === "WEEKLY" && item.status === "SUBMITTED"
      ? versions[0]?.snapshot
      : undefined;
  const references = sourceReferences(snapshot);
  const currentSources = references.length
    ? await db
        .select({ id: report.id, version: report.version })
        .from(report)
        .where(
          and(
            reportVisibility(actor),
            eq(report.type, "DAILY"),
            inArray(
              report.id,
              references.map((source) => source.id),
            ),
          ),
        )
    : [];
  const changedSources = updatedSources(snapshot, currentSources);
  return (
    <WorkspaceShell actor={actor} selected="reports">
      <ButtonLink href="/reports" variant="ghost" className="self-start">
        返回报告查询
      </ButtonLink>
      <header>
        <h1 className="text-2xl font-medium leading-8">
          {item.type === "DAILY" ? "日报" : "周报"} ·{" "}
          {item.reportDate ?? item.weekStart}
        </h1>
        <p className="mt-2 text-sm font-normal leading-5 text-slate-500">
          {item.status === "DRAFT"
            ? "本人草稿"
            : `已提交 · 版本 ${item.revisionNumber}`}
        </p>
      </header>
      {changedSources.length > 0 && (
        <section
          aria-label="来源更新"
          className="flex flex-col gap-3 rounded-xl border border-slate-200/80 p-6"
        >
          <h2 className="text-xl font-medium leading-7">来源已更新</h2>
          <p>来源日报已有新版本，本周报仍保留提交时的内容。</p>
          <div className="flex flex-wrap gap-3">
            {changedSources.map((sourceId, index) => (
              <ButtonLink
                key={sourceId}
                href={`/reports/${sourceId}`}
                variant="secondary"
              >
                查看更新日报 {index + 1}
              </ButtonLink>
            ))}
          </div>
        </section>
      )}
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200/80 p-6">
        <h2 className="text-xl font-medium leading-7">工作总结</h2>
        <p className="whitespace-pre-wrap break-words">
          {item.summary || "未填写总结"}
        </p>
        {item.noWorkReason && <p>无工作原因：{item.noWorkReason}</p>}
        {item.noPlanReason && <p>无计划原因：{item.noPlanReason}</p>}
      </section>
      {item.type === "DAILY" && (
        <Card
          className="min-w-0 overflow-hidden"
          aria-labelledby="daily-detail-title"
        >
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="daily-detail-title"
              className="text-lg font-semibold text-foreground"
            >
              日报明细
            </h2>
            <p className="text-xs tabular-nums text-muted-foreground">
              计划 {dailyPlans.length} · 实际 {dailyWorks.length} · 阻塞{" "}
              {dailyBlockers.length}
            </p>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid min-w-0 gap-6 xl:grid-cols-2">
              <DailyEntrySection
                id="daily-plans-title"
                title="工作计划"
                entries={dailyPlans}
                emptyText="暂无工作计划"
              />
              <DailyEntrySection
                id="daily-works-title"
                title="实际工作"
                entries={dailyWorks}
                emptyText="暂无实际工作"
              />
            </div>
            <section
              aria-labelledby="daily-blockers-title"
              className="border-t border-border pt-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <h3
                  id="daily-blockers-title"
                  className="text-sm font-semibold text-foreground"
                >
                  阻塞事项
                </h3>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {dailyBlockers.length} 项
                </span>
              </div>
              {dailyBlockers.length ? (
                <List
                  dataSource={dailyBlockers}
                  rowKey={(blocker, index) =>
                    String(index) + ":" + blocker.description
                  }
                  itemClassName="bg-background/60 px-4 py-3.5"
                  renderItem={(blocker) => (
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start gap-2">
                        <Badge tone="danger" showIcon={false}>
                          阻塞
                        </Badge>
                        <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                          {blocker.description}
                        </p>
                      </div>
                      <p className="mt-2 break-words text-xs text-muted-foreground">
                        关联项目 · {blocker.projectName ?? blocker.projectId}
                      </p>
                    </div>
                  )}
                />
              ) : (
                <p className="text-sm text-muted-foreground">无阻塞事项</p>
              )}
            </section>
          </CardBody>
        </Card>
      )}
      {tasks.length > 0 && (
        <section className="rounded-xl border border-slate-200/80 p-6">
          <h2 className="text-xl font-medium leading-7">任务与交付物</h2>
          {tasks.length ? (
            <ul className="mt-4 divide-y divide-separator-border">
              {tasks.map((row) => {
                const parsed = taskSnapshot.safeParse(row.snapshot);
                if (!parsed.success)
                  return (
                    <li key={row.id} className="py-4">
                      此任务快照格式无法读取，请联系管理员核查。
                    </li>
                  );
                const task = parsed.data;
                return (
                  <li key={row.id} className="flex flex-col gap-2 py-4">
                    <p className="whitespace-pre-wrap break-words">
                      {task.content}
                    </p>
                    <p className="text-sm font-normal leading-5 text-slate-500">
                      {task.kind === "PLAN" ? "计划" : "实际工作"} ·{" "}
                      {task.categoryName} ·{" "}
                      {
                        {
                          TODO: "待开始",
                          IN_PROGRESS: "进行中",
                          BLOCKED: "阻塞",
                          DONE: "完成",
                          CANCELED: "已取消",
                        }[task.status]
                      }
                      {task.dueDate ? ` · 截止 ${task.dueDate}` : ""}
                    </p>
                    {task.deliverables.length > 0 && (
                      <ul className="flex flex-wrap gap-3" aria-label="交付物">
                        {task.deliverables.map((delivery) => (
                          <li key={delivery.unitId}>
                            {delivery.quantity} {delivery.unitName}
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.type === "WEEKLY" && row.sourceReportId && (
                      <ButtonLink
                        href={`/reports/${row.sourceReportId}`}
                        variant="ghost"
                        className="self-start"
                      >
                        查看来源日报
                      </ButtonLink>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-slate-500">未关联任务</p>
          )}
        </section>
      )}
      <section className="rounded-xl border border-slate-200/80 p-6">
        <h2 className="text-xl font-medium leading-7">最近修订记录</h2>
        {versions.length > 0 && (
          <ButtonLink href={`/reports/${id}/history`} variant="ghost">
            查看历史版本与变更
          </ButtonLink>
        )}
        {versions.length ? (
          <ul className="mt-4 flex flex-col gap-3">
            {versions.map((version) => (
              <li key={version.number}>
                <ButtonLink
                  href={`/reports/${id}/history?version=${version.number}`}
                  variant="ghost"
                >
                  版本 {version.number}
                </ButtonLink>{" "}
                · {version.reason} ·{" "}
                {version.at.toLocaleString("zh-CN", {
                  timeZone: "Asia/Shanghai",
                })}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-slate-500">暂无修订记录</p>
        )}
      </section>
      {item.status === "SUBMITTED" &&
        (item.authorId === actor.id || actor.role === "BOSS") && (
          <RevisionForm
            key={`${item.id}:${item.version}`}
            reportId={item.id}
            version={item.version}
            initialSummary={item.summary ?? ""}
          />
        )}
      {item.status === "SUBMITTED" &&
        (item.authorId === actor.id || actor.role === "BOSS") && (
          <RevisionRequests
            actor={actor}
            reportId={id}
            authorId={item.authorId}
            reportVersion={item.version}
            page={requestsPage}
          />
        )}
      <CommentSection reportId={id} />
    </WorkspaceShell>
  );
}

function DailyEntrySection({
  id,
  title,
  entries,
  emptyText,
}: {
  id: string;
  title: string;
  entries: DailyEntry[];
  emptyText: string;
}) {
  return (
    <section aria-labelledby={id} className="min-w-0">
      <div className="mb-3 flex items-center gap-2">
        <h3 id={id} className="text-sm font-semibold text-foreground">
          {title}
        </h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          {entries.length} 项
        </span>
      </div>
      <DailyEntryList entries={entries} emptyText={emptyText} />
    </section>
  );
}
