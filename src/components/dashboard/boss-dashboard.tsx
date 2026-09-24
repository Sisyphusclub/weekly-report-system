"use client";

import {
  ArrowRight,
  CalendarCheck2,
  ChartNoAxesCombined,
  CircleAlert,
  ClipboardList,
  FileText,
  FolderKanban,
  Gauge,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/premium/avatar";
import { Badge, Tag } from "@/components/premium/badge";
import { Card, CardBody, CardHeader } from "@/components/premium/cards/card";
import { Drawer } from "@/components/premium/drawer";
import { List, ListItem } from "@/components/premium/list";
import { DailyEntryList } from "@/components/workspace/daily-entry-list";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/motion/tabs";
import { WorkAnalyticsCharts } from "@/components/dashboard/work-analytics-charts";
import { BossWeeklyDashboard } from "@/components/dashboard/boss-weekly-dashboard";
import { Button } from "@/components/motion/button/base";
import { ProgressCircle } from "@/components/premium/stats/progress-circle";
import { StatisticCard } from "@/components/premium/stats/statistic-card";
import { DatePicker, Select, SelectItem } from "@/components/premium/forms";
import type { DashboardBreakdown, DashboardMetrics } from "@/lib/metrics";
import type { getBossWeeklyData } from "@/lib/boss-weekly-data";
import { weekDates } from "@/lib/domain";
import { cx } from "@/utils/cx";

type Member = DashboardBreakdown["members"][number];
type Project = DashboardBreakdown["projects"][number];

export function BossDashboard({
  metrics,
  breakdown,
  todaySubmission,
  memberCount,
  selectedDate,
  selectedTab,
  selectedProjectId,
  availableProjects,
  weeklyData,
}: {
  metrics: DashboardMetrics;
  breakdown: DashboardBreakdown;
  todaySubmission: { submitted: number; total: number };
  memberCount: number;
  selectedDate: string;
  selectedTab: "daily" | "weekly" | "overview";
  selectedProjectId?: string;
  availableProjects: Array<{ id: string; name: string }>;
  weeklyData?: Awaited<ReturnType<typeof getBossWeeklyData>>;
}) {
  const router = useRouter();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const projectNames = new Map(
    breakdown.projects.map((item) => [item.id, item.name]),
  );
  const firstBlocker = breakdown.blockerItems[0];
  const submissionRate = todaySubmission.total
    ? percent(todaySubmission.submitted, todaySubmission.total)
    : 0;
  const planRate = breakdown.todayPlanFulfillment.rate ?? 0;
  return (
    <div className="w-full min-w-0">
      <DashboardFilters
        selectedDate={selectedDate}
        selectedTab={selectedTab}
        selectedProject={selectedProjectId}
        availableProjects={availableProjects}
        onDateChange={(date) => {
          const params = new URLSearchParams(window.location.search);
          if (date) params.set("date", date);
          else params.delete("date");
          router.push(`/boss/dashboard?${params.toString()}`);
        }}
        onProjectChange={(projectId) => {
          const params = new URLSearchParams(window.location.search);
          if (projectId && projectId !== "ALL")
            params.set("project", projectId);
          else params.delete("project");
          router.push(`/boss/dashboard?${params.toString()}`);
        }}
      />
      <Tabs
        value={selectedTab}
        onValueChange={(tab) => {
          if (tab === selectedTab) return;
          const params = new URLSearchParams(window.location.search);
          params.set("tab", tab);
          router.push(`/boss/dashboard?${params.toString()}`);
        }}
        variant="underline"
        size="large"
      >
        <div className="border-b border-border">
          <TabsList className="gap-0 border-b-0">
            <TabsTrigger
              value="daily"
              className="shrink-0 justify-center sm:w-[136px]"
            >
              <ClipboardList className="mr-2 size-4" aria-hidden />
              全员日报
            </TabsTrigger>
            <TabsTrigger
              value="weekly"
              className="shrink-0 justify-center sm:w-[136px]"
            >
              <CalendarCheck2 className="mr-2 size-4" aria-hidden />
              周报
            </TabsTrigger>
            <TabsTrigger
              value="overview"
              className="shrink-0 justify-center sm:w-[136px]"
            >
              <ChartNoAxesCombined className="mr-2 size-4" aria-hidden />
              项目与效能
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" animation="fade">
          <div className="flex flex-col gap-4">
            <section
              className="grid grid-cols-2 gap-2.5 xl:grid-cols-4"
              aria-label="团队指标概览"
            >
              <StatisticCard
                compact
                className="h-20 min-h-20"
                icon={Users}
                label="团队人数"
                value={memberCount}
                suffix="人"
                tone="neutral"
              />
              <StatisticCard
                compact
                className="h-20 min-h-20"
                icon={CalendarCheck2}
                label="今日提交"
                value={todaySubmission.submitted}
                suffix={`/ ${todaySubmission.total} 人`}
                tone="success"
                trailing={
                  <span className="hidden xl:block">
                    <ProgressCircle
                      value={submissionRate}
                      size={34}
                      stroke={3.5}
                      tone="success"
                      label="今日提交率"
                    />
                  </span>
                }
              />
              <StatisticCard
                compact
                className="h-20 min-h-20"
                icon={Gauge}
                label="计划兑现率"
                value={planRate}
                suffix="%"
                tone="info"
                trailing={
                  <span className="hidden xl:block">
                    <ProgressCircle
                      value={planRate}
                      size={34}
                      stroke={3.5}
                      tone="primary"
                      label="计划兑现率"
                    />
                  </span>
                }
              />
              <StatisticCard
                compact
                className="h-20 min-h-20"
                icon={CircleAlert}
                label="开放阻塞"
                value={metrics.openBlockers}
                suffix="项"
                tone={metrics.openBlockers > 0 ? "danger" : "neutral"}
              />
            </section>

            <section
              className="grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(390px,2fr)]"
              aria-label="项目全景与效能分析"
            >
              <Card className="min-w-0 overflow-hidden">
                <CardHeader className="flex items-start justify-between gap-3 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FolderKanban
                        className="size-4 text-primary"
                        aria-hidden
                      />
                      <h2 className="text-sm font-semibold text-foreground">
                        核心项目协同全景
                      </h2>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      项目状态、协同成员与本周交付物集中查看
                    </p>
                  </div>
                </CardHeader>
                {metrics.openBlockers > 0 ? (
                  <div className="flex min-w-0 items-start gap-2 border-b border-border px-5 py-2.5 text-xs">
                    <CircleAlert
                      className="mt-0.5 size-3.5 shrink-0 text-destructive"
                      aria-hidden
                    />
                    <p className="min-w-0 text-muted-foreground">
                      <span className="font-medium text-destructive">
                        {metrics.openBlockers} 项开放阻塞
                      </span>
                      {firstBlocker ? (
                        <span className="ml-2">
                          {firstBlocker.projectName} ·{" "}
                          {firstBlocker.description}
                        </span>
                      ) : null}
                    </p>
                  </div>
                ) : null}
                <CardBody className="p-0">
                  {breakdown.projects.length ? (
                    <div className="divide-y divide-border">
                      {breakdown.projects.slice(0, 5).map((project) => (
                        <ProjectSnapshot
                          key={project.id}
                          project={project}
                          onOpenLogs={() => setSelectedProject(project)}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<FolderKanban className="size-5" aria-hidden />}
                      text="暂无核心项目数据"
                    />
                  )}
                </CardBody>
              </Card>

              <WorkAnalyticsCharts
                embedded
                periodLabel="当日"
                categories={breakdown.categoryBreakdown.map((item) => ({
                  id: item.name,
                  label: item.name,
                  value: item.value,
                }))}
                deliverables={breakdown.deliverableSummary.map((item) => ({
                  id: item.unitId,
                  label: item.label,
                  value: item.quantity,
                  unit: item.unit || "项",
                }))}
              />
            </section>
          </div>
        </TabsContent>

        <TabsContent value="weekly" animation="fade">
          {weeklyData ? (
            <div className="flex flex-col gap-4">
              {selectedProjectId ? (
                <p className="text-xs text-muted-foreground">
                  按项目成员筛选；周报摘要和日报产出仍统计成员整周工作。
                </p>
              ) : null}
              <BossWeeklyDashboard {...weeklyData} />
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="daily" animation="fade">
          <div className="flex flex-col gap-4">
            <DailySummary
              breakdown={breakdown}
              todaySubmission={todaySubmission}
            />
            <MemberRoster
              members={breakdown.members}
              blockerItems={breakdown.blockerItems}
              onOpenMember={setSelectedMember}
              selectedDate={selectedDate}
            />
          </div>
        </TabsContent>
      </Tabs>

      <Drawer
        open={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        title={
          selectedMember
            ? `${selectedMember.name} · ${selectedDate.replaceAll("-", ".")} 明细`
            : "日报明细"
        }
        description="查看该成员的计划、实际工作和提交状态。"
        className="max-w-[480px]"
      >
        {selectedMember ? (
          <MemberDetail member={selectedMember} projectNames={projectNames} />
        ) : null}
      </Drawer>

      <Drawer
        open={Boolean(selectedProject)}
        onClose={() => setSelectedProject(null)}
        title={
          selectedProject
            ? `${selectedProject.name} · 当日日报流水`
            : "项目日报流水"
        }
        description="查看关联该项目的全员计划与实际工作记录。"
        className="max-w-[480px]"
      >
        {selectedProject ? (
          <ProjectReportDetail
            project={selectedProject}
            members={breakdown.members}
          />
        ) : null}
      </Drawer>
    </div>
  );
}

function DashboardFilters({
  selectedDate,
  selectedTab,
  selectedProject,
  availableProjects,
  onDateChange,
  onProjectChange,
}: {
  selectedDate: string;
  selectedTab: "daily" | "weekly" | "overview";
  selectedProject?: string;
  availableProjects: Array<{ id: string; name: string }>;
  onDateChange: (value: string) => void;
  onProjectChange: (value: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <DatePicker
        label={selectedTab === "weekly" ? "周报周期" : "日报日期"}
        value={selectedDate}
        onChange={onDateChange}
        size="small"
        formatValue={selectedTab === "weekly" ? formatWeekPeriod : undefined}
        className={
          selectedTab === "weekly" ? "w-full sm:w-72" : "w-full sm:w-52"
        }
        aria-label={selectedTab === "weekly" ? "周报周期" : "日报日期"}
      />
      <div className="w-full sm:w-56">
        <label className="mb-1.5 block px-1 text-sm font-medium text-foreground">
          项目
        </label>
        <Select
          selectedKey={selectedProject ?? "ALL"}
          onSelectionChange={onProjectChange}
          aria-label="项目"
          triggerClassName="min-h-9 rounded-lg"
        >
          <SelectItem id="ALL">全部项目</SelectItem>
          {availableProjects.map((project) => (
            <SelectItem
              key={project.id}
              id={project.id}
              textValue={project.name}
            >
              {project.name}
            </SelectItem>
          ))}
        </Select>
      </div>
    </div>
  );
}

function formatWeekPeriod(date: string) {
  const [start, , , , , , end] = weekDates(date);
  const [startYear, startMonth, startDay] = start.split("-");
  const [endYear, endMonth, endDay] = end.split("-");
  const endLabel = `${startYear === endYear ? "" : `${endYear}年`}${endMonth}月${endDay}日`;
  return `${startYear}年${startMonth}月${startDay}日 — ${endLabel}`;
}

function DailySummary({
  breakdown,
  todaySubmission,
}: {
  breakdown: DashboardBreakdown;
  todaySubmission: { submitted: number; total: number };
}) {
  const actualCount = breakdown.members.reduce(
    (total, member) => total + member.todayActualItems.length,
    0,
  );
  return (
    <section
      className="grid grid-cols-2 gap-2.5 xl:grid-cols-4"
      aria-label="日报统计"
    >
      <StatisticCard
        compact
        icon={CalendarCheck2}
        label="今日提交"
        value={todaySubmission.submitted}
        suffix={`/ ${todaySubmission.total} 人`}
        tone="success"
      />
      <StatisticCard
        compact
        icon={ClipboardList}
        label="实际工作"
        value={actualCount}
        suffix="项"
        tone="info"
      />
      <StatisticCard
        compact
        icon={Gauge}
        label="计划完成"
        value={breakdown.todayPlanFulfillment.completed}
        suffix={`/ ${breakdown.todayPlanFulfillment.due} 项`}
        tone="neutral"
      />
      <StatisticCard
        compact
        icon={CircleAlert}
        label="开放阻塞"
        value={breakdown.blockerItems.length}
        suffix="项"
        tone={breakdown.blockerItems.length ? "danger" : "neutral"}
      />
    </section>
  );
}

function MemberRoster({
  members,
  blockerItems,
  onOpenMember,
  selectedDate,
}: {
  members: DashboardBreakdown["members"];
  blockerItems: DashboardBreakdown["blockerItems"];
  onOpenMember: (member: Member) => void;
  selectedDate: string;
}) {
  const rankedMembers = [...members].sort(
    (a, b) => memberPriority(a) - memberPriority(b),
  );
  const attentionCount = members.filter(
    (member) => memberPriority(member) < 3,
  ).length;

  return (
    <Card
      className="min-w-0 overflow-hidden"
      aria-label={`${selectedDate} 全员日报速览`}
    >
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 py-3.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">成员日报</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            按阻塞、未提交和计划进度排序
          </p>
        </div>
        <Tag color={attentionCount ? "warning" : "success"}>
          {attentionCount ? `${attentionCount} 人需关注` : "全部正常"}
        </Tag>
      </CardHeader>
      {members.length ? (
        <div className="divide-y divide-border">
          <div className="hidden grid-cols-[minmax(150px,1fr)_minmax(180px,2fr)_90px_90px_100px_16px] gap-4 bg-muted/40 px-5 py-2 text-xs text-muted-foreground xl:grid">
            <span>成员</span>
            <span>工作摘要</span>
            <span>实际工作</span>
            <span>计划完成</span>
            <span>状态</span>
            <span aria-hidden />
          </div>
          {rankedMembers.map((member, index) => (
            <MemberStatusRow
              key={member.id}
              member={member}
              blocker={
                blockerItems.find(
                  (item) =>
                    item.reporterId === member.id ||
                    item.coordinatorId === member.id,
                )?.description
              }
              avatarClassName={avatarTone(index)}
              onOpen={() => onOpenMember(member)}
            />
          ))}
        </div>
      ) : (
        <EmptyState text="暂无团队日报数据" />
      )}
    </Card>
  );
}

function MemberStatusRow({
  member,
  blocker,
  avatarClassName,
  onOpen,
}: {
  member: Member;
  blocker?: string;
  avatarClassName: string;
  onOpen: () => void;
}) {
  const priority = memberPriority(member);
  const status =
    priority === 0
      ? { color: "danger" as const, label: `${member.openBlockers} 项阻塞` }
      : priority === 1
        ? { color: "warning" as const, label: "未提交" }
        : priority === 2
          ? { color: "warning" as const, label: "计划待完成" }
          : { color: "success" as const, label: "已提交" };
  const preview = blocker
    ? `阻塞：${blocker}`
    : (member.todayActualItems[0]?.content ??
      member.todayPlanItems[0]?.content ??
      "暂无工作记录");

  return (
    <Button
      variant="ghost"
      size="medium"
      onClick={onOpen}
      whileHover={{ scale: 1 }}
      pressScale={1}
      className="grid h-auto min-h-16 w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-none px-4 py-3 text-left hover:bg-muted/50 sm:px-5 xl:grid-cols-[minmax(150px,1fr)_minmax(180px,2fr)_90px_90px_100px_16px]"
      aria-label={`查看${member.name}的日报明细，${status.label}`}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Avatar
          initials={member.name.slice(0, 1)}
          size="sm"
          className={avatarClassName}
        />
        <span className="truncate text-sm font-semibold text-foreground">
          {member.name}
        </span>
      </span>
      <span
        className={cx(
          "col-span-2 row-start-2 min-w-0 truncate text-xs text-muted-foreground xl:col-span-1 xl:row-start-auto xl:text-sm",
          priority === 0 && "text-destructive",
        )}
        title={preview}
      >
        {preview}
      </span>
      <span className="hidden text-sm tabular-nums text-foreground xl:block">
        {member.todayActualItems.length} 项
      </span>
      <span className="hidden text-sm tabular-nums text-foreground xl:block">
        {member.todayCompleted} / {member.todayPlans}
      </span>
      <span className="col-start-2 row-start-1 xl:col-start-auto xl:row-start-auto">
        <Badge color={status.color}>{status.label}</Badge>
      </span>
      <ArrowRight
        className="hidden size-4 text-muted-foreground xl:block"
        aria-hidden
      />
      <span className="col-span-2 row-start-3 text-xs tabular-nums text-muted-foreground xl:hidden">
        实际 {member.todayActualItems.length} 项 · 计划 {member.todayCompleted}/
        {member.todayPlans}
      </span>
    </Button>
  );
}

function memberPriority(member: Member) {
  if (member.openBlockers > 0) return 0;
  if (!member.todaySubmitted) return 1;
  if (member.todayPlans > member.todayCompleted) return 2;
  return 3;
}

function ProjectReportDetail({
  project,
  members,
}: {
  project: Project;
  members: DashboardBreakdown["members"];
}) {
  const records = members
    .map((member) => ({
      member,
      plans: member.todayPlanItems.filter(
        (item) => item.projectId === project.id,
      ),
      actuals: member.todayActualItems.filter(
        (item) => item.projectId === project.id,
      ),
    }))
    .filter((record) => record.plans.length || record.actuals.length);

  if (!records.length) {
    return <EmptyState text="当日暂无关联该项目的日报记录" />;
  }

  return (
    <div className="divide-y divide-border">
      {records.map(({ member, plans, actuals }) => (
        <section key={member.id} className="py-4 first:pt-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar initials={member.name.slice(0, 1)} size="sm" />
              <h3 className="truncate text-sm font-semibold text-foreground">
                {member.name}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <Tag color="neutral">计划 {plans.length}</Tag>
              <Tag color="success">实际 {actuals.length}</Tag>
            </div>
          </div>
          {plans.length ? (
            <ProjectEntryGroup title="当日计划" items={plans} />
          ) : null}
          {actuals.length ? (
            <ProjectEntryGroup title="实际工作" items={actuals} actual />
          ) : null}
        </section>
      ))}
    </div>
  );
}

function ProjectEntryGroup({
  title,
  items,
  actual = false,
}: {
  title: string;
  items: Member["todayPlanItems"];
  actual?: boolean;
}) {
  return (
    <div className="mt-3">
      <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
      <List
        dataSource={items}
        rowKey={(item, index) => `${title}-${index}-${item.content}`}
        className="mt-1.5 space-y-0"
        itemClassName="rounded-none border-0 border-b border-border/70 bg-transparent px-0 py-2 last:border-b-0"
        renderItem={(item, index) => (
          <ListItem
            index={String(index + 1).padStart(2, "0")}
            title={
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span>{item.content}</span>
                  <Tag color="neutral">{item.category || "未分类"}</Tag>
                </div>
              </div>
            }
            footer={
              actual && item.deliverables.length ? (
                <span className="truncate text-xs text-info">
                  产出：{item.deliverables.join(" · ")}
                </span>
              ) : undefined
            }
          />
        )}
      />
    </div>
  );
}

function avatarTone(index: number) {
  return [
    "bg-primary/10 text-primary",
    "bg-success-subtle text-success",
    "bg-warning-subtle text-warning",
    "bg-info-subtle text-info",
  ][index % 4];
}

function ProjectSnapshot({
  project,
  onOpenLogs,
}: {
  project: Project;
  onOpenLogs: () => void;
}) {
  const total = project.completed + project.inProgress + project.blocked;
  return (
    <article className="px-5 py-5 transition-colors hover:bg-muted/20">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold leading-6 text-foreground">
              {project.name}
            </h3>
            <Badge color={project.blocked ? "danger" : "success"}>
              {project.blocked ? `${project.blocked} 项阻塞` : "运行正常"}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              负责人：
              <span className="font-medium text-foreground">
                {project.owner?.name ?? "未设置"}
              </span>
            </span>
            <span>
              本周{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {total}
              </span>{" "}
              条工作记录
            </span>
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center justify-between gap-3 sm:w-auto sm:justify-start">
          <div className="flex items-center gap-2" aria-label="协同成员">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              协同成员
            </span>
            <div className="flex -space-x-1.5">
              {project.members.slice(0, 4).map((member) => (
                <Avatar
                  key={member.id}
                  initials={member.name.slice(0, 1)}
                  size="sm"
                  className="ring-2 ring-card"
                  title={member.name}
                />
              ))}
              {project.members.length > 4 ? (
                <span className="grid size-6 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-card">
                  +{project.members.length - 4}
                </span>
              ) : null}
            </div>
          </div>
          <Button variant="outline" size="small" onClick={onOpenLogs}>
            查看日志流水 <ArrowRight className="size-3.5" aria-hidden />
          </Button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <Tag color="success">已完成 {project.completed}</Tag>
        <Tag color="info">推进中 {project.inProgress}</Tag>
        <Tag color="neutral">交付物 {project.deliverables.length} 类</Tag>
      </div>
      <div className="mt-4 flex min-w-0 items-start gap-2 border-t border-border pt-3.5">
        <FileText className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        {project.deliverables.length ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {project.deliverables.slice(0, 3).map((item) => (
              <Tag
                key={item.unitId}
                color="processing"
                className="max-w-full truncate"
              >
                {item.unitName} {item.quantity}
              </Tag>
            ))}
            {project.deliverables.length > 3 ? (
              <Tag color="neutral" className="shrink-0">
                +{project.deliverables.length - 3} 项
              </Tag>
            ) : null}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">暂未登记交付物</span>
        )}
      </div>
      {project.blocked > 0 ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
          <CircleAlert className="size-3.5" aria-hidden />
          当前有 {project.blocked} 项工作受阻，需要负责人介入。
        </p>
      ) : null}
    </article>
  );
}

function MemberDetail({
  member,
  projectNames,
}: {
  member: Member;
  projectNames: Map<string, string>;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-muted/50">
        <SummaryCell label="当日计划" value={member.todayPlans + " 项"} />
        <SummaryCell label="已完成" value={member.todayCompleted + " 项"} />
        <SummaryCell
          label="提交状态"
          value={member.todaySubmitted ? "已提交" : "未提交"}
        />
      </div>
      <section aria-labelledby="member-plans-title" className="min-w-0">
        <div className="mb-3 flex items-center gap-2">
          <h3
            id="member-plans-title"
            className="text-sm font-semibold text-foreground"
          >
            当日计划
          </h3>
          <span className="text-xs tabular-nums text-muted-foreground">
            {member.todayPlanItems.length} 项
          </span>
        </div>
        <DailyEntryList
          entries={member.todayPlanItems.map((item) => ({
            ...item,
            projectName: item.projectId
              ? projectNames.get(item.projectId)
              : undefined,
          }))}
          emptyText="暂无工作计划"
        />
      </section>
      <section aria-labelledby="member-works-title" className="min-w-0">
        <div className="mb-3 flex items-center gap-2">
          <h3
            id="member-works-title"
            className="text-sm font-semibold text-foreground"
          >
            实际工作
          </h3>
          <span className="text-xs tabular-nums text-muted-foreground">
            {member.todayActualItems.length} 项
          </span>
        </div>
        <DailyEntryList
          entries={member.todayActualItems.map((item) => ({
            ...item,
            projectName: item.projectId
              ? projectNames.get(item.projectId)
              : undefined,
          }))}
          emptyText="暂无实际工作"
        />
      </section>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 p-3">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function EmptyState({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <div className="grid min-h-28 place-items-center gap-2 border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function percent(value: number, total: number) {
  return total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
}
