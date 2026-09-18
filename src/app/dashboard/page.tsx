import { and, count, eq } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { project, user, category, deliverableUnit } from "@/lib/db/schema";
import { listReports } from "@/lib/reports";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ButtonLink } from "@/components/base/buttons/button";
import { DailySubmissions } from "@/components/workspace/daily-submissions";
import { getSubmissionData } from "@/lib/submission-data";
import {
  getDashboardBreakdown,
  getDashboardMetrics,
  submissionRate,
} from "@/lib/metrics";

export const metadata = { title: "工作看板" };
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ submissionPage?: string }>;
}) {
  const actor = await requireUser();
  const db = getDb();
  if (actor.role === "ADMIN") {
    const counts = await Promise.all([
      db
        .select({ value: count() })
        .from(user)
        .where(eq(user.organizationId, actor.organizationId)),
      db
        .select({ value: count() })
        .from(project)
        .where(eq(project.organizationId, actor.organizationId)),
      db
        .select({ value: count() })
        .from(category)
        .where(
          and(
            eq(category.organizationId, actor.organizationId),
            eq(category.enabled, true),
          ),
        ),
      db
        .select({ value: count() })
        .from(deliverableUnit)
        .where(
          and(
            eq(deliverableUnit.organizationId, actor.organizationId),
            eq(deliverableUnit.enabled, true),
          ),
        ),
    ]);
    return (
      <WorkspaceShell actor={actor} selected="dashboard">
        <header>
          <h1 className="text-title-1-medium">系统概览</h1>
          <p className="mt-2 text-body-regular text-text-secondary">
            管理员工作空间 · 账号与基础资料
          </p>
        </header>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {["账号", "项目", "启用分类", "启用交付物单位"].map((label, i) => (
            <section
              key={label}
              className="rounded-3xl border border-border-button-default p-6"
            >
              <h2 className="text-body-regular text-text-secondary">{label}</h2>
              <p className="mt-3 text-title-1-medium">{counts[i][0].value}</p>
            </section>
          ))}
        </div>
      </WorkspaceShell>
    );
  }
  const now = new Date();
  const params = await searchParams;
  const parsedPage = Number(params.submissionPage ?? 1);
  const submissionPage =
    Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const [reports, submissionData] = await Promise.all([
    listReports(actor, "", 1),
    getSubmissionData(actor, now),
  ]);
  const [metrics, breakdown] = await Promise.all([
    getDashboardMetrics(actor, now, submissionData),
    getDashboardBreakdown(actor, now, submissionData),
  ]);
  return (
    <WorkspaceShell actor={actor} selected="dashboard">
      <header>
        <p className="mb-2 text-caption-1-medium text-text-tertiary">
          团队协作空间
        </p>
        <h1 className="text-title-1-medium">工作看板</h1>
        <p className="mt-2 text-body-regular text-text-secondary">
          从工作记录中了解团队进展。
        </p>
      </header>
      {actor.role === "BOSS" && (
        <DailySubmissions
          data={submissionData}
          requestedPage={submissionPage}
        />
      )}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          [
            "本周按时提交率",
            submissionRate(metrics.onTimeReports, metrics.dueReports) === null
              ? "暂无数据"
              : `${submissionRate(metrics.onTimeReports, metrics.dueReports)}%`,
          ],
          ["待处理阻塞", String(metrics.openBlockers)],
          ["紧急阻塞", String(metrics.urgentBlockers)],
          ["本周完成任务", String(metrics.completedTasks)],
        ].map(([label, value]) => (
          <section
            key={label}
            className="rounded-3xl border border-border-button-default p-5"
          >
            <p className="text-body-regular text-text-secondary">{label}</p>
            <p className="mt-2 text-title-2-medium">{value}</p>
          </section>
        ))}
      </div>
      <p className="text-body-regular text-text-secondary">
        按当前有效成员本周已到截止时间的日报统计，扣除休息日和免报日期。
      </p>
      <section className="rounded-3xl border border-border-button-default p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-title-2-medium">最近报告</h2>
          <ButtonLink href="/reports" variant="secondary">
            查看全部
          </ButtonLink>
        </div>
        {reports.items.length ? (
          <ul className="mt-5 divide-y divide-separator-border">
            {reports.items.slice(0, 6).map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="text-body-medium">
                    {item.author} · {item.type === "DAILY" ? "日报" : "周报"} ·{" "}
                    {item.date ?? item.weekStart}
                  </p>
                  <p className="mt-1 text-body-regular text-text-secondary">
                    {item.summary || "未填写总结"}
                  </p>
                </div>
                <ButtonLink href={`/reports/${item.id}`} variant="ghost">
                  查看报告
                </ButtonLink>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-12 text-center">
            <p className="text-headline-medium">还没有可查看的报告</p>
            <p className="mt-2 text-body-regular text-text-secondary">
              团队已提交的报告会出现在这里，草稿仅本人可见。
            </p>
          </div>
        )}
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-border-button-default p-6">
          <h2 className="text-title-2-medium">成员视角</h2>
          <ul className="mt-4 divide-y divide-separator-border">
            {breakdown.members.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <span>{member.name}</span>
                <span className="text-text-secondary">
                  截至已到期日报 {member.submitted}/{member.due} · 完成{" "}
                  {member.completed} · 阻塞 {member.openBlockers}
                </span>
                <ButtonLink
                  href={`/reports?member=${encodeURIComponent(member.id)}`}
                  variant="ghost"
                >
                  查看报告
                </ButtonLink>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-3xl border border-border-button-default p-6">
          <h2 className="text-title-2-medium">成员交付物</h2>
          {breakdown.memberDeliverables.length ? (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {breakdown.memberDeliverables.map((item) => (
                <li
                  key={`${item.memberId}:${item.unitId}`}
                  className="rounded-xl bg-background-secondary-default p-3"
                >
                  <p className="text-body-medium">{item.memberName}</p>
                  <p className="text-body-regular text-text-secondary">
                    {item.quantity} {item.unitName}
                  </p>
                  <ButtonLink
                    href={`/tasks?assignee=${encodeURIComponent(item.memberId)}`}
                    variant="ghost"
                  >
                    查看任务
                  </ButtonLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-body-regular text-text-secondary">
              本周暂无交付物
            </p>
          )}
        </section>
        <section className="rounded-3xl border border-border-button-default p-6">
          <h2 className="text-title-2-medium">项目视角</h2>
          <ul className="mt-4 divide-y divide-separator-border">
            {breakdown.projects.map((project) => (
              <li key={project.id} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>{project.name}</span>
                  <ButtonLink
                    href={`/tasks?project=${project.id}`}
                    variant="ghost"
                  >
                    查看任务
                  </ButtonLink>
                </div>
                <span className="text-text-secondary">
                  完成 {project.completed} · 推进中 {project.inProgress} · 阻塞{" "}
                  {project.blocked}
                </span>
                <span className="text-text-secondary">
                  负责人：{project.owner?.name ?? "未设置"} · 参与成员：
                  {project.members.map((member) => member.name).join("、") ||
                    "暂无"}
                </span>
                {project.nextPlans.length > 0 && (
                  <span className="text-text-secondary">
                    下周计划：
                    {project.nextPlans
                      .slice(0, 3)
                      .map((plan) => plan.content)
                      .join("、")}
                  </span>
                )}
                {project.deliverables.length > 0 && (
                  <span className="text-text-secondary">
                    交付物：
                    {project.deliverables
                      .map((item) => `${item.quantity} ${item.unitName}`)
                      .join("、")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-3xl border border-border-button-default p-6">
          <h2 className="text-title-2-medium">本周阻塞趋势</h2>
          <p className="mt-2 text-body-regular text-text-secondary">
            已解决阻塞中位时长：
            {breakdown.blockerResolutionMedianHours === null
              ? "暂无数据"
              : `${breakdown.blockerResolutionMedianHours} 小时`}
          </p>
          <p className="mt-2 text-body-regular text-text-secondary">
            本周计划兑现率：
            {breakdown.planFulfillment.rate === null
              ? "暂无数据"
              : `${breakdown.planFulfillment.rate}%`}
            （{breakdown.planFulfillment.completed}/
            {breakdown.planFulfillment.due}）
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
            {breakdown.blockerTrend.map((day) => (
              <div
                key={day.date}
                className="rounded-xl bg-background-secondary-default p-3"
              >
                <p className="text-caption-1-medium text-text-secondary">
                  {day.date.slice(5)}
                </p>
                <p className="mt-2 text-body-medium">新增 {day.opened}</p>
                <p className="text-body-regular text-text-secondary">
                  解决 {day.resolved}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
