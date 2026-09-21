"use client";

import {
  ArrowRight,
  CircleAlert,
  ClipboardCheck,
  FolderKanban,
  PackageCheck,
  Send,
  Users,
} from "lucide-react";
import { Alert } from "@/components/premium/alert";
import { Avatar } from "@/components/premium/avatar";
import { Badge, Tag } from "@/components/premium/badge";
import { Card, CardBody, CardHeader } from "@/components/premium/cards/card";
import { List, ListItem } from "@/components/premium/list";
import { ProgressCircle } from "@/components/premium/stats/progress-circle";
import { Statistic } from "@/components/premium/stats/statistic-card";
import { Table } from "@/components/premium/table";
import { ConversionFunnel } from "@/components/premium/conversion-funnel";
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
  const submissionRate = todaySubmission.total
    ? percent(todaySubmission.submitted, todaySubmission.total)
    : null;
  const fulfillment = breakdown.todayPlanFulfillment.rate;
  const deliveryTypes = breakdown.deliverableSummary.length;
  const blockedItems = breakdown.blockerItems.slice(0, 3);
  const hasBlockers = metrics.openBlockers > 0 && blockedItems.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <section aria-label="团队关键指标">
        <Card className="overflow-hidden">
          <div className="grid grid-cols-2 xl:grid-cols-4">
            <MetricCell
              label="今日提交进度"
              icon={<Send className="size-4" aria-hidden />}
              iconClass="border-blue-200 bg-blue-50 text-blue-700"
              className="border-b border-border xl:border-b-0"
            >
              <div className="flex items-center justify-between gap-4">
                <Statistic
                  label=""
                  value={
                    todaySubmission.total ? todaySubmission.submitted : "—"
                  }
                  suffix={
                    todaySubmission.total
                      ? `/ ${todaySubmission.total} 人`
                      : undefined
                  }
                />
                <ProgressCircle value={submissionRate} label="今日提交进度" />
              </div>
              {todaySubmission.total ? (
                <ButtonLink
                  href="/boss/members"
                  variant="ghost"
                  size="small"
                  className="mt-2 -ml-2 text-blue-700"
                >
                  查看未提交成员 <ArrowRight className="size-3.5" aria-hidden />
                </ButtonLink>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  今日非工作日
                </p>
              )}
            </MetricCell>
            <MetricCell
              label="待处理阻塞"
              icon={<CircleAlert className="size-4" aria-hidden />}
              iconClass={
                metrics.openBlockers
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-slate-200 bg-slate-100 text-slate-600"
              }
              className={cx(
                "border-b border-l border-border xl:border-b-0",
                metrics.openBlockers && "bg-rose-50/40",
              )}
            >
              <Statistic
                label=""
                value={metrics.openBlockers}
                suffix="项"
                tone={metrics.openBlockers ? "danger" : "neutral"}
              />
              <p className="mt-1 text-xs text-rose-700">
                {metrics.urgentBlockers
                  ? `其中 ${metrics.urgentBlockers} 项紧急`
                  : "当前无紧急卡点"}
              </p>
              <ButtonLink
                href="/blockers"
                variant="ghost"
                size="small"
                className={cx(
                  "mt-2 -ml-2",
                  metrics.openBlockers ? "text-rose-700" : "text-slate-600",
                )}
              >
                查看卡点 <ArrowRight className="size-3.5" aria-hidden />
              </ButtonLink>
            </MetricCell>
            <MetricCell
              label="今日计划兑现率"
              icon={<ClipboardCheck className="size-4" aria-hidden />}
              iconClass="border-emerald-200 bg-emerald-50 text-emerald-700"
              className="xl:border-l xl:border-border"
            >
              <div className="flex items-center justify-between gap-4">
                <Statistic
                  label=""
                  value={breakdown.todayPlanFulfillment.rate ?? "—"}
                  suffix={
                    breakdown.todayPlanFulfillment.rate === null
                      ? undefined
                      : "%"
                  }
                  tone="success"
                />
                <ProgressCircle
                  value={fulfillment}
                  tone="success"
                  label="今日计划兑现率"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {breakdown.todayPlanFulfillment.due
                  ? `${breakdown.todayPlanFulfillment.completed}/${breakdown.todayPlanFulfillment.due} 项完成`
                  : "今日暂无应核销计划"}
              </p>
            </MetricCell>
            <MetricCell
              label="本周交付物类型"
              icon={<PackageCheck className="size-4" aria-hidden />}
              iconClass="border-slate-200 bg-slate-100 text-slate-700"
              className="border-l border-border"
            >
              <Statistic
                label=""
                value={deliveryTypes || "—"}
                suffix={deliveryTypes ? "类" : undefined}
              />
              <p className="mt-2 truncate text-xs text-muted-foreground">
                {breakdown.deliverableSummary
                  .slice(0, 2)
                  .map(formatDeliverable)
                  .join(" · ") || "按单位分别统计"}
              </p>
            </MetricCell>
          </div>
        </Card>
      </section>

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

      <section className="grid gap-5 xl:grid-cols-2" aria-label="工作分析图表">
        <ConversionFunnel
          title="工作分类与精力投入"
          description="按本周已提交日报中的实际工作条目统计"
          valueLabel="当前分类条目"
          valueSuffix="条"
          periods={[
            {
              id: "week",
              label: "本周",
              stages: breakdown.categoryBreakdown.map((item) => ({
                id: item.name,
                label: item.name,
                value: item.value,
                detail: `${item.value} 条实际工作记录`,
              })),
            },
          ]}
        />
        <ConversionFunnel
          title="核心交付物量化统计"
          description="从日报产出物中提取数量并按类型汇总"
          valueLabel="当前交付物"
          valueSuffix="件"
          periods={[
            {
              id: "week",
              label: "本周",
              stages: breakdown.deliverableSummary.map((item) => ({
                id: item.unitId,
                label: item.label,
                value: item.quantity,
                detail: `${item.quantity} ${item.unit}`,
              })),
            },
          ]}
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

function MetricCell({
  label,
  icon,
  iconClass,
  className,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  iconClass: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cx("min-w-0 p-4 sm:p-5", className)}>
      <div className="flex items-center gap-2">
        <span
          className={cx(
            "grid size-7 place-items-center rounded-md border",
            iconClass,
          )}
        >
          {icon}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
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

function formatDeliverable(item: { unitName: string; quantity: number }) {
  const match = item.unitName.match(/^(.*)（(.*)）$/u);
  return match
    ? `${match[1]} ${item.quantity} ${match[2]}`
    : `${item.unitName} ${item.quantity}`;
}
