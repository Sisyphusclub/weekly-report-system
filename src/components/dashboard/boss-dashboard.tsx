"use client";

import {
  ArrowRight,
  BarChart3,
  CircleAlert,
  ClipboardCheck,
  FolderKanban,
  PackageCheck,
  Send,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Alert } from "@/components/premium/alert";
import { Avatar } from "@/components/premium/avatar";
import { Badge, Tag } from "@/components/premium/badge";
import { Card, CardBody, CardHeader } from "@/components/premium/cards/card";
import { List, ListItem } from "@/components/premium/list";
import { ProgressCircle } from "@/components/premium/stats/progress-circle";
import { Statistic } from "@/components/premium/stats/statistic-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs";
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

const chartColors = ["#2563eb", "#0f766e", "#d97706", "#64748b", "#7c3aed"];

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
  const submissionRate = percent(todaySubmission.submitted, todaySubmission.total);
  const fulfillment = breakdown.todayPlanFulfillment.rate ?? 0;
  const deliveryTotal = breakdown.deliverableSummary.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const blockedItems = breakdown.blockerItems.slice(0, 3);
  const hasBlockers = metrics.openBlockers > 0 && blockedItems.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <section aria-label="团队关键指标">
        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
            <MetricCell
              label="今日提交进度"
              icon={<Send className="size-4" aria-hidden />}
              iconClass="border-blue-200 bg-blue-50 text-blue-700"
            >
              <div className="flex items-center justify-between gap-4">
                <Statistic
                  label=""
                  value={todaySubmission.submitted}
                  suffix={`/ ${todaySubmission.total} 人`}
                />
                <ProgressCircle value={submissionRate} label="今日提交进度" />
              </div>
              <ButtonLink
                href="/boss/members"
                variant="ghost"
                size="small"
                className="mt-2 -ml-2 text-blue-700"
              >
                一键催办 <ArrowRight className="size-3.5" aria-hidden />
              </ButtonLink>
            </MetricCell>
            <MetricCell
              label="待处理阻塞"
              icon={<CircleAlert className="size-4" aria-hidden />}
              iconClass={
                metrics.openBlockers
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-slate-200 bg-slate-100 text-slate-600"
              }
              className={metrics.openBlockers ? "bg-rose-50/40" : undefined}
            >
              <Statistic
                label=""
                value={metrics.openBlockers}
                suffix={metrics.urgentBlockers ? `${metrics.urgentBlockers} 项紧急` : "项"}
                tone={metrics.openBlockers ? "danger" : "neutral"}
              />
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
            >
              <div className="flex items-center justify-between gap-4">
                <Statistic
                  label=""
                  value={breakdown.todayPlanFulfillment.rate ?? 0}
                  suffix="%"
                  tone="success"
                />
                <ProgressCircle
                  value={fulfillment}
                  tone="success"
                  label="今日计划兑现率"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {breakdown.todayPlanFulfillment.completed}/{breakdown.todayPlanFulfillment.due} 项完成
              </p>
            </MetricCell>
            <MetricCell
              label="本周交付物总量"
              icon={<PackageCheck className="size-4" aria-hidden />}
              iconClass="border-violet-200 bg-violet-50 text-violet-700"
            >
              <Statistic label="" value={deliveryTotal} suffix="件" />
              <p className="mt-2 truncate text-xs text-muted-foreground">
                {breakdown.deliverableSummary.slice(0, 3).map((item) => `${item.unitName} ${item.quantity}`).join(" · ") || "暂无交付物"}
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
        <Card className="h-[320px] overflow-hidden">
          <CardHeader className="flex items-center justify-between gap-3 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">工作分类与精力投入</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">本周任务按分类分布</p>
            </div>
            <BarChart3 className="size-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardBody className="grid h-[calc(320px-61px)] min-h-0 grid-cols-[minmax(0,1fr)_145px] items-center gap-3 py-3">
            {breakdown.categoryBreakdown.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown.categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="56%"
                    outerRadius="78%"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {breakdown.categoryBreakdown.map((item, index) => (
                      <Cell key={item.name} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} 项`, "任务"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty text="本周暂无任务分类数据" />
            )}
            <div className="min-w-0 space-y-2">
              {breakdown.categoryBreakdown.slice(0, 5).map((item, index) => (
                <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card className="h-[320px] overflow-hidden">
          <CardHeader className="flex items-center justify-between gap-3 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">核心交付物量化统计</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">本周累计交付物数量</p>
            </div>
            <PackageCheck className="size-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardBody className="h-[calc(320px-61px)] py-3">
            {breakdown.deliverableSummary.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={breakdown.deliverableSummary.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 4, right: 14, bottom: 4, left: 8 }}
                >
                  <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis type="category" dataKey="unitName" width={60} axisLine={false} tickLine={false} tick={{ fill: "#334155", fontSize: 11 }} />
                  <Tooltip formatter={(value) => [`${value}`, "数量"]} />
                  <Bar dataKey="quantity" fill="#2563eb" radius={[0, 5, 5, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty text="本周暂无交付物数据" />
            )}
          </CardBody>
        </Card>
      </section>

      <section aria-label="团队协同视图">
        <Tabs defaultValue="projects" variant="underline">
          <div className="flex items-center justify-between gap-3 border-b border-border">
            <TabsList className="w-full overflow-x-auto">
              <TabsTrigger value="projects">
                <FolderKanban className="mr-1.5 size-4" aria-hidden />
                核心项目协同全景
              </TabsTrigger>
              <TabsTrigger value="members">
                <Users className="mr-1.5 size-4" aria-hidden />
                团队成员履约看板
              </TabsTrigger>
            </TabsList>
            <ButtonLink href="/reports" variant="ghost" size="small" className="hidden shrink-0 sm:inline-flex">
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
              <EmptyState icon={<FolderKanban className="size-5" aria-hidden />} text="暂无核心项目数据" />
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
              <EmptyState icon={<Users className="size-5" aria-hidden />} text="暂无团队成员数据" />
            )}
          </TabsContent>
        </Tabs>
      </section>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">最近报告</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">快速查看团队最新填报</p>
          </div>
          <ButtonLink href="/reports" variant="ghost" size="small">
            全部报告 <ArrowRight className="size-3.5" aria-hidden />
          </ButtonLink>
        </CardHeader>
        <CardBody className="p-0">
          {reports.length ? (
            <ul className="divide-y divide-border">
              {reports.slice(0, 5).map((report) => (
                <li key={report.id} className="grid gap-2 px-5 py-3 sm:grid-cols-[130px_minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{report.author}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{report.type === "DAILY" ? "日报" : "周报"} · {report.date ?? report.weekStart}</p>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{report.summary || "未填写总结"}</p>
                  <Badge color={report.status === "SUBMITTED" ? "success" : "warning"}>
                    {report.status === "SUBMITTED" ? "已提交" : "草稿"}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState text="暂无报告记录" />
          )}
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
        <span className={cx("grid size-7 place-items-center rounded-md border", iconClass)}>{icon}</span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
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
  const completion = total ? Math.round((project.completed / total) * 100) : 0;
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex items-start justify-between gap-3 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">{project.name}</h3>
            {project.blocked > 0 ? <Badge color="danger">{project.blocked} 项阻塞</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">负责人：{project.owner?.name ?? "未设置"}</p>
        </div>
        <div className="flex shrink-0 -space-x-1.5">
          {project.members.slice(0, 4).map((member) => (
            <Avatar key={member.id} initials={member.name.slice(0, 1)} size="sm" className="ring-2 ring-card" />
          ))}
          {project.members.length > 4 ? <span className="grid size-6 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 ring-2 ring-card">+{project.members.length - 4}</span> : null}
        </div>
      </CardHeader>
      <CardBody className="space-y-4 pt-3">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <MetricMini label="已完成" value={project.completed} tone="success" />
          <MetricMini label="推进中" value={project.inProgress} tone="info" />
          <MetricMini label="兑现率" value={`${completion}%`} tone="neutral" />
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${completion}%` }} />
        </div>
        <List
          dataSource={project.nextPlans.slice(0, 3)}
          rowKey={(item) => item.id}
          itemClassName="bg-slate-50/70"
          emptyState="暂无待推进计划"
          renderItem={(item, index) => (
            <ListItem
              index={String(index + 1).padStart(2, "0")}
              title={item.content}
              footer={<span className="truncate text-xs text-muted-foreground">成员分工：{project.members.find((member) => member.id === item.assigneeId)?.name ?? "待分配"}</span>}
            />
          )}
        />
        {project.deliverables.length ? (
          <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
            {project.deliverables.map((item) => <Tag key={item.unitId} color="info">{item.unitName} {item.quantity}</Tag>)}
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
  const fulfillment = percent(member.completed, member.due);
  const submitted = member.due > 0 && member.submitted >= member.due;
  return (
    <Card className={cx("overflow-hidden", member.openBlockers && "border-rose-200")}>
      <CardBody className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar initials={member.name.slice(0, 1)} size="md" />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground">{member.name}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">今日履约看板</p>
            </div>
          </div>
          <Badge color={member.openBlockers ? "danger" : submitted ? "success" : "warning"}>
            {member.openBlockers ? `${member.openBlockers} 项阻塞` : submitted ? "已提交" : "待跟进"}
          </Badge>
        </div>
        <div className="grid grid-cols-2 divide-x divide-border rounded-lg border border-border bg-slate-50/70">
          <div className="p-3">
            <p className="text-xs text-muted-foreground">今日计划</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{member.due}<span className="ml-1 text-xs font-medium text-muted-foreground">项</span></p>
          </div>
          <div className="p-3">
            <p className="text-xs text-muted-foreground">今日实际</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{member.completed}<span className="ml-1 text-xs font-medium text-muted-foreground">项</span></p>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">计划兑现率</span>
            <span className="font-semibold tabular-nums text-foreground">{fulfillment}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={cx("h-full rounded-full", member.openBlockers ? "bg-rose-700" : "bg-emerald-600")} style={{ width: `${fulfillment}%` }} />
          </div>
        </div>
        <ButtonLink href={`/reports?member=${encodeURIComponent(member.id)}`} variant="ghost" size="small" className="-ml-2">
          查看明细 <ArrowRight className="size-3.5" aria-hidden />
        </ButtonLink>
      </CardBody>
    </Card>
  );
}

function MetricMini({ label, value, tone }: { label: string; value: number | string; tone: "success" | "info" | "neutral" }) {
  return (
    <div className="rounded-md bg-slate-50 px-2.5 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cx("mt-0.5 text-sm font-semibold tabular-nums", tone === "success" ? "text-emerald-700" : tone === "info" ? "text-blue-700" : "text-foreground")}>{value}</p>
    </div>
  );
}

function ChartEmpty({ text }: { text: string }) {
  return <div className="col-span-full grid h-full place-items-center text-sm text-muted-foreground">{text}</div>;
}

function EmptyState({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return <div className="grid min-h-36 place-items-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 text-center text-sm text-muted-foreground">{icon}<span>{text}</span></div>;
}

function percent(value: number, total: number) {
  return total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
}
