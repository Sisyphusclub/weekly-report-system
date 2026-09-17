import { and, eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { report, reportRevision, reportTask } from "@/lib/db/schema";
import { taskSnapshot } from "@/lib/task-snapshot";
import { reportVisibility } from "@/lib/reports";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ButtonLink } from "@/components/base/buttons/button";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireUser();
  const { id } = await params;
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
  const versions = await db
    .select({
      number: reportRevision.revisionNumber,
      reason: reportRevision.reason,
      at: reportRevision.createdAt,
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
      <section className="flex flex-col gap-4 rounded-3xl border border-border-button-default p-6">
        <h2 className="text-title-2-medium">工作总结</h2>
        <p className="whitespace-pre-wrap break-words">
          {item.summary || "未填写总结"}
        </p>
        {item.noWorkReason && <p>无工作原因：{item.noWorkReason}</p>}
        {item.noPlanReason && <p>无计划原因：{item.noPlanReason}</p>}
      </section>
      <section className="rounded-3xl border border-border-button-default p-6">
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
      </section>
      <section className="rounded-3xl border border-border-button-default p-6">
        <h2 className="text-title-2-medium">最近修订记录</h2>
        {versions.length ? (
          <ul className="mt-4 flex flex-col gap-3">
            {versions.map((version) => (
              <li key={version.number}>
                版本 {version.number} · {version.reason} ·{" "}
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
    </WorkspaceShell>
  );
}
