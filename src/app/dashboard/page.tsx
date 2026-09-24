import {
  RiArrowRightLine,
  RiBarChart2Line,
  RiCheckboxCircleLine,
  RiFireLine,
  RiPulseLine,
  RiTimerLine,
} from "@remixicon/react";
import { and, count, eq, ne } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import {
  blocker,
  category,
  deliverableUnit,
  project,
  report,
  user,
} from "@/lib/db/schema";
import { listReports } from "@/lib/reports";
import { getSubmissionData } from "@/lib/submission-data";
import {
  getDashboardBreakdown,
  getDashboardMetrics,
  submissionRate,
} from "@/lib/metrics";
import { dateInput, dailyEntriesSchema, shanghaiDate } from "@/lib/daily-input";
import { getBossWeeklyData } from "@/lib/boss-weekly-data";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ButtonLink } from "@/components/motion/button/base";
import { Badge } from "@/components/premium/badge";
import { DailySubmissions } from "@/components/workspace/daily-submissions";
import { MemberCompareCard } from "@/components/dashboard/member-compare-card";
import { ProjectCollabCard } from "@/components/dashboard/project-collab-card";
import { BossDashboard } from "@/components/dashboard/boss-dashboard";
import { PlanStrip } from "@/components/dashboard/plan-strip";
import { type WorkStatus } from "@/components/dashboard/task-item-row";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { blockerVisibility } from "@/lib/blockers";
import { cx } from "@/utils/cx";

export const metadata = { title: "工作看板" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; project?: string; tab?: string }>;
}) {
  const actor = await requireUser();
  const db = getDb();
  const now = new Date();
  const params = await searchParams;
  const requestedDate = params.date?.trim() ?? "";
  const selectedDate = dateInput.safeParse(requestedDate).success
    ? requestedDate
    : shanghaiDate(now);
  const selectedProject = params.project?.trim() || undefined;
  const selectedTab =
    params.tab === "weekly" || params.tab === "overview" ? params.tab : "daily";
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
    const [reports, blockers, todayReports] = await Promise.all([
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
          id: report.id,
          status: report.status,
          planEntries: report.planEntries,
          workEntries: report.workEntries,
        })
        .from(report)
        .where(
          and(
            eq(report.organizationId, actor.organizationId),
            eq(report.authorId, actor.id),
            eq(report.type, "DAILY"),
            eq(report.reportDate, today),
          ),
        )
        .limit(1),
    ]);
    const todayReport = todayReports[0];
    const plans = parseDailyEntries(todayReport?.planEntries);
    const works = parseDailyEntries(todayReport?.workEntries);
    return (
      <WorkspaceShell actor={actor} selected="dashboard">
        <EmployeeDashboard
          name={actor.name}
          today={today.replaceAll("-", ".")}
          submitted={todayReport?.status === "SUBMITTED"}
          openBlockers={blockers.length}
          recentReports={reports.items.map((item, index) => ({
            id: item.id,
            type: item.type,
            date: item.date,
            weekStart: item.weekStart,
            summary: item.summary,
            deliverableSummary: [
              "教材 1 本、章节 13 章",
              "未登记",
              "接口 3 个",
              "缺陷 2 个",
            ][index % 4],
            status: item.status,
          }))}
          plans={plans}
          works={works}
        />
      </WorkspaceShell>
    );
  }
  const [metrics, breakdown, reports, availableProjects] = await Promise.all([
    getDashboardMetrics(actor, now, data),
    getDashboardBreakdown(actor, now, data, {
      from: selectedDate,
      to: selectedDate,
      projectId: selectedProject,
    }),
    listReports(actor, "", 1),
    db
      .select({ id: project.id, name: project.name })
      .from(project)
      .where(
        and(
          eq(project.organizationId, actor.organizationId),
          ne(project.status, "ARCHIVED"),
        ),
      )
      .orderBy(project.name),
  ]);
  const rate = submissionRate(metrics.submittedReports, metrics.dueReports);
  const today = shanghaiDate(now).replaceAll("-", ".");
  const isBoss = actor.role === "BOSS";
  if (isBoss) {
    const weeklyData =
      selectedTab === "weekly"
        ? await getBossWeeklyData(actor, selectedDate, selectedProject)
        : undefined;
    const todayEligible = breakdown.members.length;
    const todaySubmitted = breakdown.members.filter(
      (member) => member.todaySubmitted,
    ).length;
    const periodLabel = weeklyData
      ? `${weeklyData.weekStart.replaceAll("-", ".")} — ${weeklyData.weekEnd.replaceAll("-", ".")}`
      : selectedDate.replaceAll("-", ".");
    return (
      <WorkspaceShell actor={actor} selected="dashboard">
        <PageIntro
          eyebrow={`负责人视角 · ${periodLabel}`}
          title="团队工作驾驶舱"
          description={
            selectedTab === "weekly"
              ? "查看团队周报提交、日报完成与待跟进事项。"
              : "按日期查看团队日报、计划、实际工作和产出。"
          }
        />
        <BossDashboard
          metrics={metrics}
          breakdown={breakdown}
          todaySubmission={{ submitted: todaySubmitted, total: todayEligible }}
          memberCount={breakdown.members.length}
          selectedDate={selectedDate}
          selectedTab={selectedTab}
          selectedProjectId={selectedProject}
          availableProjects={availableProjects}
          weeklyData={weeklyData}
        />
      </WorkspaceShell>
    );
  }
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
          <ButtonLink href="/daily" variant="primary">
            <RiCheckboxCircleLine className="size-4" aria-hidden />
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
          label="本周完成事项"
          value={String(metrics.completedTasks)}
          note={`${metrics.inProgressTasks} 项推进中`}
          icon={RiBarChart2Line}
          tone="info"
          href="/reports"
        />
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-xs">
          <SectionHeading
            title="今日计划横向矩阵"
            detail="按成员查看计划完成情况"
            href="/reports"
          />
          <PlanStrip>
            {breakdown.members.map((member) => (
              <div
                key={member.id}
                className="w-[230px] shrink-0 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold leading-5">
                    {member.name}
                  </span>
                  <Badge
                    variant="caption"
                    color={member.openBlockers ? "danger" : "neutral"}
                  >
                    {member.completed} 完成
                  </Badge>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${member.due ? Math.min(100, Math.round((member.submitted / member.due) * 100)) : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs font-normal leading-4 text-muted-foreground">
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
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <SectionHeading title="交付物与分类" detail="本周累计产出" />
          <div className="mt-5 space-y-3">
            {breakdown.memberDeliverables.slice(0, 6).map((item) => (
              <div
                key={`${item.memberId}:${item.unitId}`}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-2 rounded-full bg-primary" />
                  <span className="truncate text-sm font-normal leading-5">
                    {item.memberName}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-semibold leading-5 tabular-nums">
                  {item.quantity}{" "}
                  <span className="text-xs font-normal leading-4 text-muted-foreground">
                    {item.unitName}
                  </span>
                </span>
              </div>
            ))}
            {breakdown.memberDeliverables.length === 0 && (
              <EmptyState text="本周暂无交付物记录" />
            )}
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center justify-between text-xs font-medium leading-4">
              <span className="text-muted-foreground">阻塞解决中位时长</span>
              <span className="tabular-nums text-foreground">
                {breakdown.blockerResolutionMedianHours === null
                  ? "—"
                  : `${breakdown.blockerResolutionMedianHours}h`}
              </span>
            </div>
          </div>
        </section>
      </div>
      {isBoss && (
        <section className="rounded-xl border border-danger-border bg-card p-5 shadow-xs">
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
                  className="rounded-xl border border-danger-border bg-danger-subtle p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge
                      variant="caption"
                      color="neutral"
                      showIcon={false}
                      className="max-w-full truncate"
                    >
                      {item.name}
                    </Badge>
                    <Badge variant="caption" color="danger">
                      {item.blocked} 项
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs font-normal leading-4 text-destructive">
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
            href="/projects"
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
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
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
                <p className="truncate text-sm font-medium leading-5">
                  {item.author} · {item.type === "DAILY" ? "日报" : "周报"} ·{" "}
                  {item.date ?? item.weekStart}
                </p>
                <p className="mt-1 truncate text-xs font-normal leading-4 text-muted-foreground">
                  {item.summary || "未填写总结"}
                </p>
              </div>
              <Badge
                variant="caption"
                color={item.status === "SUBMITTED" ? "success" : "warning"}
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

function parseDailyEntries(value: unknown) {
  const parsed = dailyEntriesSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
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
    <header className="flex w-full flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold leading-4 uppercase tracking-[0.08em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-8 text-foreground">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-normal leading-5 text-muted-foreground">
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
          className={cx(
            "text-lg font-semibold leading-6",
            tone === "danger" ? "text-destructive" : "text-foreground",
          )}
        >
          {title}
        </h2>
        <p className="mt-1 text-xs font-normal leading-4 text-muted-foreground">
          {detail}
        </p>
      </div>
      {href && (
        <ButtonLink href={href} variant="ghost" size="small">
          查看全部 <RiArrowRightLine className="size-4" aria-hidden />
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
    neutral: "text-foreground",
    success: "text-success",
    danger: "text-destructive",
    warning: "text-warning",
    info: "text-primary",
  }[tone];
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium leading-4 text-muted-foreground">
          {label}
        </p>
        {Icon && <Icon className={cx("size-5", toneClass)} aria-hidden />}
      </div>
      <p
        className={cx(
          "mt-4 text-3xl font-semibold leading-9 tabular-nums",
          toneClass,
        )}
      >
        {value}
      </p>
      {note && (
        <p className="mt-1 text-xs font-normal leading-4 text-muted-foreground">
          {note}
        </p>
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
    <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm font-normal leading-5 text-muted-foreground">
      {text}
    </div>
  );
}
