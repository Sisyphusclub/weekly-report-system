"use client";

import {
  ArrowRight,
  FolderKanban,
  Users,
} from "lucide-react";
import { Alert } from "@/components/premium/alert";
import { Avatar } from "@/components/premium/avatar";
import { Badge, Tag } from "@/components/premium/badge";
import { Card, CardBody, CardHeader } from "@/components/premium/cards/card";
import { List, ListItem } from "@/components/premium/list";
import { Table } from "@/components/premium/table";
import { MetricDistribution } from "@/components/premium/stats/metric-distribution";
import { PlanStrip } from "@/components/dashboard/plan-strip";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/motion/tabs";
import { ButtonLink } from "@/components/motion/button/base";
import type { DashboardBreakdown, DashboardMetrics } from "@/lib/metrics";
import { cx } from "@/utils/cx";

type RecentReport = {
  id: string;
  author: string;
  type: string;
  date: string | null;
  weekStart: string | null;
  summary: string | null;
  status: string;
};

export function BossDashboard({
  metrics,
  breakdown,
  todaySubmission,
  reports,
}: {
  metrics: DashboardMetrics;
  breakdown: DashboardBreakdown;
  todaySubmission: { submitted: number; total: number };
  reports: RecentReport[];
}) {
  const totalPlans = breakdown.planFulfillment.due;
  const followUp = metrics.inProgressTasks + metrics.openBlockers;
  const projectNames = new Map(breakdown.projects.map((item) => [item.id, item.name]));
  const blockedItems = breakdown.blockerItems.slice(0, 3);
  const hasBlockers = metrics.openBlockers > 0 && blockedItems.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <OverviewTotals
        items={[
          { label: "总人数", value: todaySubmission.total, tone: "neutral" },
          { label: "工作项", value: metrics.totalTasks, tone: "neutral" },
          { label: "已完成", value: metrics.completedTasks, tone: "success" },
          { label: "待跟进", value: followUp, tone: "warning" },
          { label: "工作计划", value: totalPlans, tone: "info" },
          { label: "今日提交", value: todaySubmission.submitted, tone: "success" },
        ]}
      />

      <section aria-label="阻塞作战室">
        <Alert
          type={hasBlockers ? "error" : "success"}
          showIcon
          message={
            hasBlockers
              ? `阻塞作战室 · ${metrics.openBlockers} 项待协调`
              : "阻塞作战室 · 当前无待协调事项"
          }
          description={
            hasBlockers
              ? blockedItems
                  .map((item) => `${item.projectName}：${item.description}`)
                  .join(" · ")
              : "团队当前没有需要负责人介入的开放卡点。"
          }
          action={
            <ButtonLink
              href={hasBlockers ? "/blockers" : "/boss/members"}
              variant={hasBlockers ? "secondary" : "ghost"}
              size="small"
              className={hasBlockers ? "text-rose-700" : "text-emerald-700"}
            >
              {hasBlockers ? "立即指派协调人" : "查看团队状态"}
              <ArrowRight className="size-3.5" aria-hidden />
            </ButtonLink>
          }
        />
      </section>

      <section aria-label="今日工作计划">
        <Card className="overflow-hidden">
          <CardHeader className="flex items-end justify-between gap-3 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">今日工作计划</h2>
              <p className="mt-1 text-xs text-muted-foreground">按成员查看计划、进度和交付方向</p>
            </div>
            <ButtonLink href="/reports" variant="ghost" size="small">
              查看日报 <ArrowRight className="size-3.5" aria-hidden />
            </ButtonLink>
          </CardHeader>
          <CardBody className="p-4 pt-3">
            {breakdown.members.length ? (
              <PlanStrip>
                {breakdown.members.map((member) => (
                  <MemberPlanColumn
                    key={member.id}
                    member={member}
                    projectNames={projectNames}
                  />
                ))}
              </PlanStrip>
            ) : (
              <EmptyState text="暂无团队成员数据" />
            )}
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2" aria-label="工作分析图表">
        <MetricDistribution
          title="工作分类与精力投入"
          description="按本周已提交日报中的实际工作条目统计"
          emptyText="本周暂无已提交的实际工作"
          items={breakdown.categoryBreakdown.map((item, index) => ({
            id: item.name,
            label: item.name,
            value: item.value,
            suffix: "项",
            tone: index === 0 ? "success" : index === 1 ? "info" : "neutral",
          }))}
        />
        <MetricDistribution
          title="核心交付物量化统计"
          description="从日报产出物中提取数量并按类型汇总"
          emptyText="本周日报暂未登记量化产出"
          items={breakdown.deliverableSummary.slice(0, 10).map((item) => ({
            id: item.unitId,
            label: item.label,
            value: item.quantity,
            suffix: item.unit || "项",
            tone: "info",
          }))}
        />
      </section>

      <section aria-label="团队协同视图">
        <Tabs defaultValue="projects" variant="underline">
          <div className="flex items-center justify-between gap-3 border-b border-border">
            <TabsList className="w-full">
              <TabsTrigger value="projects">
                <FolderKanban className="mr-1.5 size-4" aria-hidden />
                核心项目协同全景
              </TabsTrigger>
              <TabsTrigger value="members">
                <Users className="mr-1.5 size-4" aria-hidden />
                团队成员履约看板
              </TabsTrigger>
            </TabsList>
            <ButtonLink
              href="/reports"
              variant="ghost"
              size="small"
              className="hidden shrink-0 sm:inline-flex"
            >
              查看报告 <ArrowRight className="size-3.5" aria-hidden />
            </ButtonLink>
          </div>

          <TabsContent value="projects">
            {breakdown.projects.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {breakdown.projects.slice(0, 6).map((project) => (
                  <ProjectOverview key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<FolderKanban className="size-5" aria-hidden />}
                text="暂无核心项目数据"
              />
            )}
          </TabsContent>

          <TabsContent value="members">
            {breakdown.members.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {breakdown.members.slice(0, 9).map((member) => (
                  <MemberOverview key={member.id} member={member} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Users className="size-5" aria-hidden />}
                text="暂无团队成员数据"
              />
            )}
          </TabsContent>
        </Tabs>
      </section>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">最近报告</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              快速查看团队最新填报
            </p>
          </div>
          <ButtonLink href="/reports" variant="ghost" size="small">
            全部报告 <ArrowRight className="size-3.5" aria-hidden />
          </ButtonLink>
        </CardHeader>
        <CardBody className="p-0">
          <Table
            columns={[
              {
                key: "reporter",
                title: "报告类型与日期",
                width: "190px",
                render: (report) => (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {report.author}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {report.type === "DAILY" ? "日报" : "周报"} ·{" "}
                      {report.date ?? report.weekStart ?? "未填写日期"}
                    </p>
                  </div>
                ),
              },
              {
                key: "summary",
                title: "工作内容摘要",
                render: (report) => (
                  <span className="truncate text-sm text-muted-foreground">
                    {report.summary || "未填写总结"}
                  </span>
                ),
              },
              {
                key: "status",
                title: "状态",
                width: "96px",
                render: (report) => (
                  <Badge
                    color={
                      report.status === "SUBMITTED" ? "success" : "warning"
                    }
                  >
                    {report.status === "SUBMITTED" ? "已提交" : "草稿"}
                  </Badge>
                ),
              },
              {
                key: "action",
                title: "操作",
                width: "84px",
                align: "right",
                render: (report) => (
                  <ButtonLink
                    href={`/reports/${report.id}`}
                    variant="ghost"
                    size="small"
                  >
                    查看
                  </ButtonLink>
                ),
              },
            ]}
            dataSource={reports.slice(0, 5)}
            rowKey="id"
            size="middle"
            emptyState={<EmptyState text="暂无报告记录" />}
          />
        </CardBody>
      </Card>
    </div>
  );
}

function OverviewTotals({
  items,
}: {
  items: Array<{
    label: string;
    value: number;
    tone: "neutral" | "info" | "success" | "warning";
  }>;
}) {
  return (
    <Card className="overflow-hidden">
      <CardBody className="grid grid-cols-2 divide-x divide-y divide-border p-0 md:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
        {items.map((item) => (
          <div key={item.label} className="min-w-0 px-4 py-3.5 xl:px-5">
            <p className="truncate text-xs font-medium text-muted-foreground">{item.label}</p>
            <p
              className={cx(
                "mt-1 text-xl font-semibold tabular-nums",
                item.tone === "success"
                  ? "text-emerald-700"
                  : item.tone === "warning"
                    ? "text-amber-700"
                    : item.tone === "info"
                      ? "text-blue-700"
                      : "text-slate-900",
              )}
            >
              {item.value}
            </p>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

function MemberPlanColumn({
  member,
  projectNames,
}: {
  member: DashboardBreakdown["members"][number];
  projectNames: Map<string, string>;
}) {
  const fulfillment = member.todayPlans
    ? percent(member.todayCompleted, member.todayPlans)
    : 0;

  return (
    <Card className="w-[255px] shrink-0 overflow-hidden">
      <CardBody className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar initials={member.name.slice(0, 1)} size="sm" />
            <p className="truncate text-sm font-semibold text-foreground">{member.name}</p>
          </div>
          <Badge color={member.openBlockers ? "danger" : member.todaySubmitted ? "success" : "warning"}>
            {member.openBlockers ? `${member.openBlockers} 项阻塞` : member.todaySubmitted ? "已提交" : "待跟进"}
          </Badge>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">计划 {member.todayPlans} 项</span>
          <span className="font-semibold tabular-nums text-slate-700">完成 {fulfillment}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${member.name} 今日计划完成率`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={fulfillment}>
          <div className={cx("h-full rounded-full", member.openBlockers ? "bg-rose-600" : "bg-emerald-500")} style={{ width: `${fulfillment}%` }} />
        </div>
        <List
          dataSource={member.todayPlanItems.slice(0, 4)}
          rowKey={(item, index) => `${member.id}-${index}-${item.content}`}
          className="mt-3 space-y-1.5"
          itemClassName="border-slate-200/80 bg-slate-50/70 p-2"
          emptyState={<p className="px-1 py-2 text-xs text-muted-foreground">今日暂无工作计划</p>}
          renderItem={(item, index) => (
            <ListItem
              index={String(index + 1).padStart(2, "0")}
              title={
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Tag color="neutral" className="max-w-[100px] truncate">{item.projectId ? projectNames.get(item.projectId) ?? "未关联项目" : "未关联项目"}</Tag>
                    <span className="truncate">{item.content}</span>
                  </div>
                  <p className="mt-1 truncate text-[11px] font-normal text-muted-foreground">{item.category}</p>
                </div>
              }
              trailing={<Badge color={item.status === "DONE" ? "success" : item.status === "BLOCKED" ? "danger" : "warning"}>{statusLabel(item.status)}</Badge>}
            />
          )}
        />
      </CardBody>
    </Card>
  );
}

function ProjectOverview({
  project,
}: {
  project: DashboardBreakdown["projects"][number];
}) {
  const total = project.completed + project.inProgress + project.blocked;
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex items-start justify-between gap-3 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {project.name}
            </h3>
            {project.blocked > 0 ? (
              <Badge color="danger">{project.blocked} 项阻塞</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            负责人：{project.owner?.name ?? "未设置"}
          </p>
        </div>
        <div className="flex shrink-0 -space-x-1.5">
          {project.members.slice(0, 4).map((member) => (
            <Avatar
              key={member.id}
              initials={member.name.slice(0, 1)}
              size="sm"
              className="ring-2 ring-card"
            />
          ))}
          {project.members.length > 4 ? (
            <span className="grid size-6 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 ring-2 ring-card">
              +{project.members.length - 4}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardBody className="space-y-4 pt-3">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <MetricMini label="已完成" value={project.completed} tone="success" />
          <MetricMini label="推进中" value={project.inProgress} tone="info" />
          <MetricMini label="阻塞" value={project.blocked} tone="danger" />
        </div>
        <p className="text-xs text-muted-foreground">
          本周共 {total} 条工作记录，按状态分开展示。
        </p>
        {project.nextPlans.length ? (
          <List
            dataSource={project.nextPlans.slice(0, 3)}
            rowKey={(item) => item.id}
            itemClassName="bg-slate-50/70"
            renderItem={(item, index) => (
              <ListItem
                index={String(index + 1).padStart(2, "0")}
                title={item.content}
                footer={
                  <span className="truncate text-xs text-muted-foreground">
                    成员分工：
                    {project.members.find(
                      (member) => member.id === item.assigneeId,
                    )?.name ?? "待分配"}
                  </span>
                }
              />
            )}
          />
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
            今日暂无待推进计划
          </p>
        )}
        {project.deliverables.length ? (
          <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
            {project.deliverables.map((item) => (
              <Tag key={item.unitId} color="info">
                {item.unitName} {item.quantity}
              </Tag>
            ))}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function MemberOverview({
  member,
}: {
  member: DashboardBreakdown["members"][number];
}) {
  const fulfillment = member.todayPlans
    ? percent(member.todayCompleted, member.todayPlans)
    : null;
  const submitted = member.todaySubmitted;
  return (
    <Card
      className={cx(
        "overflow-hidden",
        member.openBlockers && "border-rose-200",
      )}
    >
      <CardBody className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar initials={member.name.slice(0, 1)} size="md" />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground">
                {member.name}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                今日履约看板
              </p>
            </div>
          </div>
          <Badge
            color={
              member.openBlockers ? "danger" : submitted ? "success" : "warning"
            }
          >
            {member.openBlockers
              ? `${member.openBlockers} 项阻塞`
              : submitted
                ? "已提交"
                : "待跟进"}
          </Badge>
        </div>
        <div className="grid grid-cols-2 divide-x divide-border rounded-lg border border-border bg-slate-50/70">
          <div className="p-3">
            <p className="text-xs text-muted-foreground">今日计划</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {member.todayPlans}
              <span className="ml-1 text-xs font-medium text-muted-foreground">
                项
              </span>
            </p>
          </div>
          <div className="p-3">
            <p className="text-xs text-muted-foreground">今日实际</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {member.todayActuals}
              <span className="ml-1 text-xs font-medium text-muted-foreground">
                项
              </span>
            </p>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">计划兑现率</span>
            <span className="font-semibold tabular-nums text-foreground">
              {fulfillment === null ? "—" : `${fulfillment}%`}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cx(
                "h-full rounded-full",
                member.openBlockers ? "bg-rose-700" : "bg-emerald-600",
              )}
              style={{ width: fulfillment === null ? "0%" : `${fulfillment}%` }}
            />
          </div>
        </div>
        <ButtonLink
          href={`/reports?member=${encodeURIComponent(member.id)}`}
          variant="ghost"
          size="small"
          className="-ml-2"
        >
          查看明细 <ArrowRight className="size-3.5" aria-hidden />
        </ButtonLink>
      </CardBody>
    </Card>
  );
}

function MetricMini({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "success" | "info" | "neutral" | "danger";
}) {
  return (
    <div className="rounded-md bg-slate-50 px-2.5 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cx(
          "mt-0.5 text-sm font-semibold tabular-nums",
          tone === "success"
            ? "text-emerald-700"
            : tone === "info"
              ? "text-blue-700"
              : tone === "danger"
                ? "text-rose-700"
                : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <div className="grid min-h-36 place-items-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 text-center text-sm text-muted-foreground">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function percent(value: number, total: number) {
  return total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
}

function statusLabel(status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED") {
  return {
    TODO: "待开始",
    IN_PROGRESS: "进行中",
    BLOCKED: "阻塞",
    DONE: "完成",
    CANCELED: "已取消",
  }[status];
}
