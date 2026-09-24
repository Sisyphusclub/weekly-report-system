import { and, eq, desc, inArray } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Clock3,
  ListChecks,
  FileCheck2,
  History,
  MessageSquareText,
} from "lucide-react";
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
import { PageHeader } from "@/components/premium/page-header";
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
      <PageHeader
        eyebrow={
          <>
            <ButtonLink
              href="/reports"
              variant="ghost"
              size="small"
              className="-ml-2 gap-1.5"
            >
              <ArrowLeft className="size-4" aria-hidden />
              返回报告查询
            </ButtonLink>
            <span className="hidden text-border sm:inline" aria-hidden>
              /
            </span>
            <span className="hidden text-muted-foreground sm:inline">
              {item.type === "DAILY" ? "日报详情" : "周报详情"}
            </span>
          </>
        }
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{item.type === "DAILY" ? "日报" : "周报"}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-primary">
              {item.reportDate ?? item.weekStart}
            </span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden />
              {item.type === "DAILY" ? "工作日提交" : "周期汇总"}
            </span>
            <span className="text-border" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-4" aria-hidden />
              版本 {item.revisionNumber}
            </span>
          </span>
        }
        meta={
          <Badge tone={item.status === "DRAFT" ? "warning" : "success"}>
            {item.status === "DRAFT" ? "草稿" : "已提交"}
          </Badge>
        }
        className="pb-4"
      />
      {changedSources.length > 0 && (
        <Card
          className="border-warning-border bg-warning-subtle/40"
          aria-label="来源更新"
        >
          <CardBody className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <AlertTriangle
                className="mt-0.5 size-5 shrink-0 text-warning"
                aria-hidden
              />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">
                  来源日报已更新
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  本周报仍保留提交时的内容。
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 pl-8 sm:pl-0">
              {changedSources.map((sourceId, index) => (
                <ButtonLink
                  key={sourceId}
                  href={`/reports/${sourceId}`}
                  variant="secondary"
                  size="small"
                >
                  查看日报 {index + 1}
                </ButtonLink>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
      <Card aria-labelledby="summary-title">
        <CardHeader className="flex items-center gap-3 py-3.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <MessageSquareText className="size-4" aria-hidden />
          </div>
          <h2
            id="summary-title"
            className="text-base font-semibold text-foreground"
          >
            工作总结
          </h2>
        </CardHeader>
        <CardBody className="space-y-3 py-5">
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
            {item.summary || "未填写总结"}
          </p>
          {(item.noWorkReason || item.noPlanReason) && (
            <div className="grid gap-2 border-t border-border pt-3 text-sm text-muted-foreground sm:grid-cols-2">
              {item.noWorkReason && <p>无工作原因：{item.noWorkReason}</p>}
              {item.noPlanReason && <p>无计划原因：{item.noPlanReason}</p>}
            </div>
          )}
        </CardBody>
      </Card>
      {item.type === "DAILY" && (
        <Card
          className="min-w-0 overflow-hidden border-primary/20"
          aria-labelledby="daily-detail-title"
        >
          <CardHeader className="flex flex-wrap items-center justify-between gap-3 bg-primary/[0.035] py-4">
            <div className="flex items-center gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <ListChecks className="size-4" aria-hidden />
              </div>
              <div>
                <h2
                  id="daily-detail-title"
                  className="text-base font-semibold text-foreground"
                >
                  日报明细
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  计划、实际工作与阻塞事项
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
              <span>{dailyPlans.length} 计划</span>
              <span aria-hidden>·</span>
              <span>{dailyWorks.length} 实际</span>
              <span aria-hidden>·</span>
              <span>{dailyBlockers.length} 阻塞</span>
            </div>
          </CardHeader>
          <CardBody className="space-y-5 p-4 sm:p-5">
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
        <Card aria-labelledby="task-title">
          <CardHeader className="flex items-center gap-3 py-3.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-info-subtle text-info">
              <FileCheck2 className="size-4" aria-hidden />
            </div>
            <div>
              <h2
                id="task-title"
                className="text-base font-semibold text-foreground"
              >
                任务与交付物
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                关联任务的提交快照
              </p>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {tasks.length ? (
              <ul className="divide-y divide-border">
                {tasks.map((row) => {
                  const parsed = taskSnapshot.safeParse(row.snapshot);
                  if (!parsed.success)
                    return (
                      <li key={row.id} className="px-5 py-4">
                        此任务快照格式无法读取，请联系管理员核查。
                      </li>
                    );
                  const task = parsed.data;
                  return (
                    <li key={row.id} className="flex flex-col gap-2 px-5 py-4">
                      <p className="whitespace-pre-wrap break-words text-sm font-medium leading-6 text-foreground">
                        {task.content}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
                      </div>
                      {task.deliverables.length > 0 && (
                        <ul
                          className="flex flex-wrap gap-3"
                          aria-label="交付物"
                        >
                          {task.deliverables.map((delivery) => (
                            <li
                              key={delivery.unitId}
                              className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                            >
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
              <p className="px-5 py-5 text-sm text-muted-foreground">
                未关联任务
              </p>
            )}
          </CardBody>
        </Card>
      )}
      <Card aria-labelledby="revision-title">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 py-3.5">
          <div className="flex items-center gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <History className="size-4" aria-hidden />
            </div>
            <div>
              <h2
                id="revision-title"
                className="text-base font-semibold text-foreground"
              >
                最近修订记录
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                记录每次修改的版本与原因
              </p>
            </div>
          </div>
          {versions.length > 0 && (
            <ButtonLink
              href={`/reports/${id}/history`}
              variant="secondary"
              size="small"
            >
              查看全部版本
            </ButtonLink>
          )}
        </CardHeader>
        <CardBody className="p-0">
          {versions.length ? (
            <ul className="divide-y divide-border">
              {versions.map((version) => (
                <li
                  key={version.number}
                  className="flex flex-wrap items-center gap-2 px-5 py-3.5"
                >
                  <ButtonLink
                    href={`/reports/${id}/history?version=${version.number}`}
                    variant="secondary"
                    size="small"
                  >
                    版本 {version.number}
                  </ButtonLink>
                  <span className="min-w-0 flex-1 break-words text-sm text-foreground">
                    {version.reason}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {version.at.toLocaleString("zh-CN", {
                      timeZone: "Asia/Shanghai",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-5 text-sm text-muted-foreground">
              暂无修订记录
            </p>
          )}
        </CardBody>
      </Card>
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
