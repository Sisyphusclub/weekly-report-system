import {
  RiArrowRightLine,
  RiBarChart2Line,
  RiCheckboxCircleLine,
  RiFireLine,
  RiPulseLine,
  RiTimerLine,
} from "@remixicon/react";
import { and, count, eq, inArray, ne, or } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import {
  blocker,
  category,
  deliverable,
  deliverableUnit,
  project,
  projectMember,
  reportTask,
  user,
  workTask,
} from "@/lib/db/schema";
import { listReports } from "@/lib/reports";
import { getSubmissionData } from "@/lib/submission-data";
import {
  getDashboardBreakdown,
  getDashboardMetrics,
  submissionRate,
} from "@/lib/metrics";
import { employeeDailyMetrics } from "@/lib/employee-metrics";
import { shanghaiDate } from "@/lib/daily-input";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ButtonLink } from "@/components/motion/button/base";
import { Badge } from "@/components/premium/badge";
import { DailySubmissions } from "@/components/workspace/daily-submissions";
import { MemberCompareCard } from "@/components/dashboard/member-compare-card";
import { ProjectCollabCard } from "@/components/dashboard/project-collab-card";
import { PlanStrip } from "@/components/dashboard/plan-strip";
import { type WorkStatus } from "@/components/dashboard/task-item-row";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { blockerVisibility } from "@/lib/blockers";
import { taskSnapshot } from "@/lib/task-snapshot";

export const metadata = { title: "工作看板" };

export default async function DashboardPage() {
  const actor = await requireUser();
  const db = getDb();
  const now = new Date();
  const data = await getSubmissionData(actor, now);
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
        <PageIntro
          eyebrow="今天"
          title="日报总览"
          description="掌握今日填报进度，优先处理未提交与逾期成员。"
        />
        <DailySubmissions
          data={data}
          requestedPage={1}
          showReportLinks={false}
        />
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            ["账号", counts[0][0].value, "/admin/users"],
            ["项目", counts[1][0].value, "/admin/projects"],
            ["启用分类", counts[2][0].value, "/admin/dictionaries"],
            ["交付物单位", counts[3][0].value, "/admin/dictionaries"],
          ].map(([label, value, href]) => (
            <MetricCard
              key={String(label)}
              label={String(label)}
              value={String(value)}
              href={String(href)}
            />
          ))}
        </section>
      </WorkspaceShell>
    );
  }
  if (actor.role === "EMPLOYEE") {
    const today = shanghaiDate(now);
    const [memberships, assignedProjects] = await Promise.all([
      db
        .select({ projectId: projectMember.projectId })
        .from(projectMember)
        .where(
          and(
            eq(projectMember.organizationId, actor.organizationId),
            eq(projectMember.userId, actor.id),
          ),
        ),
      db
        .select({ projectId: workTask.projectId })
        .from(workTask)
        .where(
          and(
            eq(workTask.organizationId, actor.organizationId),
            eq(workTask.primaryAssigneeId, actor.id),
          ),
        ),
    ]);
    const memberProjectIds = [
      ...new Set([
        ...memberships.map((item) => item.projectId),
        ...assignedProjects.map((item) => item.projectId),
      ]),
    ];
    const [taskRows, reports, blockers, deliveryRows, employeeProjects, employeeCategories, employeeUnits] = await Promise.all([
      db
        .select({
          id: workTask.id,
          version: workTask.version,
          content: workTask.content,
          kind: workTask.kind,
          status: workTask.status,
          categoryName: workTask.categoryName,
          workDate: workTask.workDate,
          dueDate: workTask.dueDate,
          sourceTaskId: workTask.sourceTaskId,
          projectName: project.name,
        })
        .from(workTask)
        .leftJoin(
          project,
          and(
            eq(project.id, workTask.projectId),
            eq(project.organizationId, workTask.organizationId),
          ),
        )
        .where(
          and(
            eq(workTask.organizationId, actor.organizationId),
            eq(workTask.primaryAssigneeId, actor.id),
            or(eq(workTask.workDate, today), eq(workTask.dueDate, today)),
          ),
        )
        .orderBy(workTask.kind, workTask.status, workTask.updatedAt),
      listReports(actor, "", 1, { member: actor.id }),
      db
        .select({ id: blocker.id })
        .from(blocker)
        .where(
          and(
            blockerVisibility(actor),
            ne(blocker.status, "RESOLVED"),
            eq(blocker.reporterId, actor.id),
          ),
        ),
      db
        .select({
          taskId: deliverable.taskId,
          unitName: deliverable.unitName,
          quantity: deliverable.quantity,
        })
        .from(deliverable)
        .innerJoin(
          workTask,
          and(
            eq(workTask.id, deliverable.taskId),
            eq(workTask.organizationId, deliverable.organizationId),
          ),
        )
        .where(
          and(
            eq(deliverable.organizationId, actor.organizationId),
            eq(workTask.primaryAssigneeId, actor.id),
            or(eq(workTask.workDate, today), eq(workTask.dueDate, today)),
          ),
        ),
      db
        .select({ id: project.id, name: project.name })
        .from(project)
        .where(
          and(
            eq(project.organizationId, actor.organizationId),
            ne(project.status, "ARCHIVED"),
            or(
              eq(project.ownerId, actor.id),
              memberProjectIds.length ? inArray(project.id, memberProjectIds) : undefined,
            ),
          ),
        )
        .orderBy(project.name),
      db
        .select({ id: category.id, name: category.name })
        .from(category)
        .where(
          and(
            eq(category.organizationId, actor.organizationId),
            eq(category.enabled, true),
          ),
        )
        .orderBy(category.sortOrder, category.name),
      db
        .select({ id: deliverableUnit.id, name: deliverableUnit.name })
        .from(deliverableUnit)
        .where(
          and(
            eq(deliverableUnit.organizationId, actor.organizationId),
            eq(deliverableUnit.enabled, true),
          ),
        )
        .orderBy(deliverableUnit.sortOrder, deliverableUnit.name),
    ]);
    const recentReportItems = reports.items.slice(0, 5);
    const reportTaskRows = recentReportItems.length
      ? await db
          .select({
            reportId: reportTask.reportId,
            snapshot: reportTask.snapshot,
          })
          .from(reportTask)
          .where(
            and(
              eq(reportTask.organizationId, actor.organizationId),
              inArray(
                reportTask.reportId,
                recentReportItems.map((item) => item.id),
              ),
            ),
          )
      : [];
    const todayReport = data.reports.find(
      (item) =>
        item.authorId === actor.id &&
        item.reportDate === today &&
        item.status === "SUBMITTED",
    );
    return (
      <WorkspaceShell actor={actor} selected="dashboard">
        <EmployeeDashboard
          name={actor.name}
          today={today.replaceAll("-", ".")}
          submitted={Boolean(todayReport)}
          openBlockers={blockers.length}
          recentReports={reports.items.map((item) => ({
            id: item.id,
            type: item.type,
            date: item.date,
            weekStart: item.weekStart,
            summary: item.summary,
            deliverableSummary: summarizeDeliverables(
              reportTaskRows
                .filter((row) => row.reportId === item.id)
                .map((row) => row.snapshot),
            ),
            status: item.status,
          }))}
          tasks={taskRows.map((task) => ({
            id: task.id,
            version: task.version,
            content: task.content,
            kind: task.kind,
            status: task.status as WorkStatus,
            projectName: task.projectName ?? "未关联项目",
            categoryName: task.categoryName,
            workDate: task.workDate,
            dueDate: task.dueDate,
            sourceTaskId: task.sourceTaskId,
            deliverables: deliveryRows
              .filter((item) => item.taskId === task.id)
              .map((item) => ({
                unitName: item.unitName,
                quantity: item.quantity,
              })),
          }))}
          projects={employeeProjects}
          categories={employeeCategories}
          deliverableUnits={employeeUnits}
          dailyMetrics={employeeDailyMetrics(
            taskRows.map((task) => ({
              id: task.id,
              kind: task.kind,
              status: task.status,
              sourceTaskId: task.sourceTaskId,
            })),
          )}
        />
      </WorkspaceShell>
    );
  }
  const [metrics, breakdown, reports] = await Promise.all([
    getDashboardMetrics(actor, now, data),
    getDashboardBreakdown(actor, now, data),
    listReports(actor, "", 1),
  ]);
  const rate = submissionRate(metrics.submittedReports, metrics.dueReports);
  const today = shanghaiDate(now).replaceAll("-", ".");
  const isBoss = actor.role === "BOSS";
  return (
    <WorkspaceShell actor={actor} selected="dashboard">
      <PageIntro
        eyebrow={isBoss ? "负责人视角 · 今日" : today}
        title={isBoss ? "团队工作驾驶舱" : "工作看板"}
        description={
          isBoss
            ? "从提交进度、阻塞和计划兑现率判断团队今天是否需要介入。"
            : "查看本周工作进展、交付物与待跟进事项。"
        }
        action={
          <ButtonLink
            href="/daily"
            variant="primary"
            leadingIcon={RiCheckboxCircleLine}
          >
            填写今日日报
          </ButtonLink>
        }
      />
      {isBoss && <DailySubmissions data={data} requestedPage={1} />}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="本周按时提交"
          value={rate === null ? "—" : `${rate}%`}
          note={`${metrics.submittedReports}/${metrics.dueReports} 已提交`}
          icon={RiCheckboxCircleLine}
          tone="success"
        />
        <MetricCard
          label="待处理阻塞"
          value={String(metrics.openBlockers)}
          note={
            metrics.urgentBlockers
              ? `${metrics.urgentBlockers} 项紧急`
              : "当前无紧急项"
          }
          icon={RiFireLine}
          tone={metrics.openBlockers ? "danger" : "neutral"}
          href="/blockers"
        />
        <MetricCard
          label="计划兑现率"
          value={
            breakdown.planFulfillment.rate === null
              ? "—"
              : `${breakdown.planFulfillment.rate}%`
          }
          note={`${breakdown.planFulfillment.completed}/${breakdown.planFulfillment.due} 项完成`}
          icon={RiPulseLine}
          tone="warning"
        />
        <MetricCard
          label="本周完成任务"
          value={String(metrics.completedTasks)}
          note={`${metrics.inProgressTasks} 项推进中`}
          icon={RiBarChart2Line}
          tone="info"
          href="/tasks"
        />
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <section className="min-w-0 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
          <SectionHeading
            title="今日计划横向矩阵"
            detail="按成员查看计划完成情况"
            href={isBoss ? "/reports" : "/tasks"}
          />
          <PlanStrip>
            {breakdown.members.map((member) => (
              <div
                key={member.id}
                className="w-[230px] shrink-0 rounded-xl border border-border-button-default bg-background-secondary-default p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-body-semibold">
                    {member.name}
                  </span>
                  <Badge
                    variant="caption"
                    color={member.openBlockers ? "rose" : "soft"}
                  >
                    {member.completed} 完成
                  </Badge>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-background-tertiary-default">
                  <div
                    className="h-full rounded-full bg-accent-500"
                    style={{
                      width: `${member.due ? Math.min(100, Math.round((member.submitted / member.due) * 100)) : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-caption-1-regular text-text-tertiary">
                  计划履约 ·{" "}
                  {member.due
                    ? Math.round((member.submitted / member.due) * 100)
                    : 0}
                  %
                </p>
              </div>
            ))}
          </PlanStrip>
        </section>
        <section className="rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
          <SectionHeading title="交付物与分类" detail="本周累计产出" />
          <div className="mt-5 space-y-3">
            {breakdown.memberDeliverables.slice(0, 6).map((item) => (
              <div
                key={`${item.memberId}:${item.unitId}`}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-2 rounded-full bg-accent-500" />
                  <span className="truncate text-body-regular">
                    {item.memberName}
                  </span>
                </div>
                <span className="shrink-0 text-body-semibold tabular-nums">
                  {item.quantity}{" "}
                  <span className="text-caption-1-regular text-text-tertiary">
                    {item.unitName}
                  </span>
                </span>
              </div>
            ))}
            {breakdown.memberDeliverables.length === 0 && (
              <EmptyState text="本周暂无交付物记录" />
            )}
          </div>
          <div className="mt-5 border-t border-separator-border pt-4">
            <div className="flex items-center justify-between text-caption-1-medium">
              <span className="text-text-secondary">阻塞解决中位时长</span>
              <span className="tabular-nums text-text-primary">
                {breakdown.blockerResolutionMedianHours === null
                  ? "—"
                  : `${breakdown.blockerResolutionMedianHours}h`}
              </span>
            </div>
          </div>
        </section>
      </div>
      {isBoss && (
        <section className="rounded-2xl border border-status-rose-text/30 bg-background-primary-default p-5 shadow-xs">
          <SectionHeading
            title="阻塞作战室"
            detail={`${metrics.openBlockers} 项待协调`}
            href="/blockers"
            tone="danger"
          />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {breakdown.projects
              .filter((item) => item.blocked > 0)
              .slice(0, 3)
              .map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-status-rose-background p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-body-semibold text-status-rose-text">
                      {item.name}
                    </p>
                    <Badge variant="caption" color="rose">
                      {item.blocked} 项
                    </Badge>
                  </div>
                  <p className="mt-2 text-caption-1-regular text-status-rose-text">
                    项目内存在阻塞，需要负责人介入协调。
                  </p>
                </div>
              ))}
            {breakdown.projects.every((item) => item.blocked === 0) && (
              <EmptyState text="当前没有项目阻塞" />
            )}
          </div>
        </section>
      )}
      <div
        id="projects"
        className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
      >
        <section className="min-w-0">
          <SectionHeading
            title="成员视角"
            detail="今日计划与实际完成对照"
            href="/reports"
          />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {breakdown.members.slice(0, 6).map((member, index) => (
              <MemberCompareCard
                key={member.id}
                member={member}
                plans={breakdown.projects
                  .flatMap((project) =>
                    project.nextPlans.slice(0, 1).map((plan) => ({
                      content: plan.content,
                      projectName: project.name,
                      status: "TODO" as WorkStatus,
                    })),
                  )
                  .slice(index, index + 2)}
                hasRisk={member.openBlockers > 0}
              />
            ))}
          </div>
          {breakdown.members.length === 0 && <EmptyState text="暂无成员数据" />}
        </section>
        <section>
          <SectionHeading
            title="项目协同"
            detail="跨成员贡献聚合"
            href="/tasks"
          />
          <div className="mt-4 space-y-3">
            {breakdown.projects.slice(0, 5).map((item) => (
              <ProjectCollabCard key={item.id} project={item} />
            ))}
            {breakdown.projects.length === 0 && (
              <EmptyState text="暂无项目数据" />
            )}
          </div>
        </section>
      </div>
      <section className="rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
        <SectionHeading
          title="最近报告"
          detail={`${reports.total} 份可查看`}
          href="/reports"
        />
        <ul className="mt-3 divide-y divide-separator-border">
          {reports.items.slice(0, 4).map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-body-medium">
                  {item.author} · {item.type === "DAILY" ? "日报" : "周报"} ·{" "}
                  {item.date ?? item.weekStart}
                </p>
                <p className="mt-1 truncate text-caption-1-regular text-text-tertiary">
                  {item.summary || "未填写总结"}
                </p>
              </div>
              <Badge
                variant="caption"
                color={item.status === "SUBMITTED" ? "lime" : "yellow"}
              >
                {item.status === "SUBMITTED" ? "已提交" : "草稿"}
              </Badge>
            </li>
          ))}
        </ul>
      </section>
    </WorkspaceShell>
  );
}

function summarizeDeliverables(snapshots: unknown[]) {
  const totals = new Map<string, number>();
  for (const snapshot of snapshots) {
    const parsed = taskSnapshot.safeParse(snapshot);
    if (!parsed.success) continue;
    for (const item of parsed.data.deliverables) {
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity)) continue;
      totals.set(item.unitName, (totals.get(item.unitName) ?? 0) + quantity);
    }
  }
  if (!totals.size) return "未登记";
  return [...totals]
    .map(
      ([unitName, quantity]) =>
        `${quantity.toLocaleString("zh-CN", { maximumFractionDigits: 4 })} ${unitName}`,
    )
    .join("、");
}

function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-caption-1-semibold uppercase tracking-[0.08em] text-accent-600">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-title-1-semibold tracking-[-0.02em]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-body-regular text-text-secondary">
          {description}
        </p>
      </div>
      {action}
    </header>
  );
}
function SectionHeading({
  title,
  detail,
  href,
  tone = "default",
}: {
  title: string;
  detail: string;
  href?: string;
  tone?: "default" | "danger";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h2
          className={`text-title-3-semibold ${tone === "danger" ? "text-status-rose-text" : "text-text-primary"}`}
        >
          {title}
        </h2>
        <p className="mt-1 text-caption-1-regular text-text-tertiary">
          {detail}
        </p>
      </div>
      {href && (
        <ButtonLink
          href={href}
          variant="ghost"
          size="small"
          trailingIcon={RiArrowRightLine}
        >
          查看全部
        </ButtonLink>
      )}
    </div>
  );
}
function MetricCard({
  label,
  value,
  note,
  href,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note?: string;
  href?: string;
  icon?: typeof RiTimerLine;
  tone?: "neutral" | "success" | "danger" | "warning" | "info";
}) {
  const toneClass = {
    neutral: "text-text-primary",
    success: "text-state-success-base",
    danger: "text-status-rose-text",
    warning: "text-status-yellow-text",
    info: "text-status-blue-text",
  }[tone];
  return (
    <section className="rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <p className="text-caption-1-medium text-text-secondary">{label}</p>
        {Icon && <Icon className={`size-5 ${toneClass}`} aria-hidden />}
      </div>
      <p className={`mt-4 text-display-4-semibold tabular-nums ${toneClass}`}>
        {value}
      </p>
      {note && (
        <p className="mt-1 text-caption-1-regular text-text-tertiary">{note}</p>
      )}
      {href && (
        <ButtonLink
          href={href}
          variant="ghost"
          size="small"
          className="mt-3 -ml-2"
        >
          查看详情
        </ButtonLink>
      )}
    </section>
  );
}
function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-button-default px-4 py-8 text-center text-body-regular text-text-tertiary">
      {text}
    </div>
  );
}

