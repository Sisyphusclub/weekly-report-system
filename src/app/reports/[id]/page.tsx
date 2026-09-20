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
import { RevisionForm } from "@/components/workspace/revision-form";
import { RevisionRequests } from "@/components/workspace/revision-requests";
import { CommentSection } from "@/components/workspace/comment-section";
import { dailyBlockersSchema, dailyEntriesSchema } from "@/lib/daily-input";

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
        <h1 className="text-title-1-medium">
          {item.type === "DAILY" ? "日报" : "周报"} ·{" "}
          {item.reportDate ?? item.weekStart}
        </h1>
        <p className="mt-2 text-body-regular text-text-secondary">
          {item.status === "DRAFT"
            ? "本人草稿"
            : `已提交 · 版本 ${item.revisionNumber}`}
        </p>
      </header>
      {changedSources.length > 0 && (
        <section
          aria-label="来源更新"
          className="flex flex-col gap-3 rounded-3xl border border-border-button-default p-6"
        >
          <h2 className="text-title-2-medium">来源已更新</h2>
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
      <section className="flex flex-col gap-4 rounded-3xl border border-border-button-default p-6">
        <h2 className="text-title-2-medium">工作总结</h2>
        <p className="whitespace-pre-wrap break-words">
          {item.summary || "未填写总结"}
        </p>
        {item.noWorkReason && <p>无工作原因：{item.noWorkReason}</p>}
        {item.noPlanReason && <p>无计划原因：{item.noPlanReason}</p>}
      </section>
      {item.type === "DAILY" && (
        <section className="rounded-3xl border border-border-button-default p-6">
          <h2 className="text-title-2-medium">日报明细</h2>
          <DailyEntrySection title="工作计划 / 进度" entries={dailyPlans} />
          <DailyEntrySection title="工作内容 / 产出" entries={dailyWorks} />
          <div className="mt-6">
            <h3 className="text-body-medium">阻塞事项</h3>
            {dailyBlockers.length ? (
              <ul className="mt-3 flex flex-col gap-2">
                {dailyBlockers.map((blocker, index) => (
                  <li key={index} className="rounded-lg bg-status-rose-background p-3">
                    {blocker.description} · 关联项目 {blocker.projectName ?? blocker.projectId}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-text-secondary">无阻塞事项</p>
            )}
          </div>
        </section>
      )}
      {tasks.length > 0 && <section className="rounded-3xl border border-border-button-default p-6">
        <h2 className="text-title-2-medium">任务与交付物</h2>
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
                  <p className="text-body-regular text-text-secondary">
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
          <p className="mt-4 text-text-secondary">未关联任务</p>
        )}
      </section>}
      <section className="rounded-3xl border border-border-button-default p-6">
        <h2 className="text-title-2-medium">最近修订记录</h2>
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
          <p className="mt-4 text-text-secondary">暂无修订记录</p>
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
  title,
  entries,
}: {
  title: string;
  entries: Array<{
    content: string;
    status: string;
    category: string;
    deliverables: string[];
  }>;
}) {
  return (
    <div className="mt-5">
      <h3 className="text-body-medium">{title}</h3>
      {entries.length ? (
        <ol className="mt-3 flex flex-col gap-2">
          {entries.map((entry, index) => (
            <li key={index} className="rounded-lg border border-border-button-default p-3">
              <p>{index + 1}、{entry.content}</p>
              <p className="mt-1 text-body-regular text-text-secondary">
                {entry.status === "DONE" ? "已完成" : entry.status === "IN_PROGRESS" ? "进行中" : entry.status === "TODO" ? "未开始" : entry.status === "BLOCKED" ? "阻塞" : "已取消"} · 类型：{entry.category}
              </p>
              {entry.deliverables.length > 0 && <p className="mt-1 text-body-regular text-text-secondary">产出：{entry.deliverables.join(" ")}</p>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-text-secondary">暂无条目</p>
      )}
    </div>
  );
}
