"use client";

import {
  ArrowRight,
  CalendarCheck2,
  CircleAlert,
  FileText,
  FolderKanban,
  Gauge,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Alert } from "@/components/premium/alert";
import { Avatar } from "@/components/premium/avatar";
import { Badge, Tag } from "@/components/premium/badge";
import { Card, CardBody, CardHeader } from "@/components/premium/cards/card";
import { Drawer } from "@/components/premium/drawer";
import { List, ListItem } from "@/components/premium/list";
import { WorkAnalyticsCharts } from "@/components/dashboard/work-analytics-charts";
import { Button } from "@/components/motion/button/base";
import { ProgressCircle } from "@/components/premium/stats/progress-circle";
import { StatisticCard } from "@/components/premium/stats/statistic-card";
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

type Member = DashboardBreakdown["members"][number];

export function BossDashboard({
  metrics,
  breakdown,
  todaySubmission,
  memberCount,
  reports,
}: {
  metrics: DashboardMetrics;
  breakdown: DashboardBreakdown;
  todaySubmission: { submitted: number; total: number };
  memberCount: number;
  reports: RecentReport[];
}) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [reportsOpen, setReportsOpen] = useState(false);
  const projectNames = new Map(
    breakdown.projects.map((item) => [item.id, item.name]),
  );
  const blockedItems = breakdown.blockerItems.slice(0, 3);
  const hasBlockers = metrics.openBlockers > 0 && blockedItems.length > 0;
  const submissionRate = todaySubmission.total
    ? percent(todaySubmission.submitted, todaySubmission.total)
    : 0;
  const planRate = breakdown.todayPlanFulfillment.rate ?? 0;
  const attentionMembers = breakdown.members.filter(
    (member) =>
      member.openBlockers > 0 ||
      !member.todaySubmitted ||
      (member.todayPlans > 0 && member.todayCompleted < member.todayPlans),
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <section
        className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="团队指标概览"
      >
        <StatisticCard
          className="h-20 min-h-20"
          icon={Users}
          label="团队人数"
          value={memberCount}
          suffix="人"
          tone="neutral"
        />
        <StatisticCard
          className="h-20 min-h-20"
          icon={CalendarCheck2}
          label="今日提交"
          value={todaySubmission.submitted}
          suffix={`/ ${todaySubmission.total} 人`}
          tone="success"
          trailing={
            <ProgressCircle
              value={submissionRate}
              size={34}
              stroke={3.5}
              tone="success"
              label="今日提交率"
            />
          }
        />
        <StatisticCard
          className="h-20 min-h-20"
          icon={Gauge}
          label="计划兑现率"
          value={planRate}
          suffix="%"
          tone="info"
          trailing={
            <ProgressCircle
              value={planRate}
              size={34}
              stroke={3.5}
              tone="primary"
              label="计划兑现率"
            />
          }
        />
        <StatisticCard
          className="h-20 min-h-20"
          icon={CircleAlert}
          label="开放阻塞"
          value={metrics.openBlockers}
          suffix="项"
          tone={metrics.openBlockers > 0 ? "danger" : "neutral"}
        />
      </section>

      <Alert
        type={hasBlockers ? "error" : "success"}
        showIcon
        message={
          hasBlockers
            ? `团队阻塞概览 · ${metrics.openBlockers} 项开放`
            : "团队阻塞概览 · 当前无开放事项"
        }
        description={
          hasBlockers
            ? blockedItems
                .map((item) => `${item.projectName}：${item.description}`)
                .join(" · ")
            : "当前没有开放阻塞记录。"
        }
      />

      <section
        className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(390px,2fr)]"
        aria-label="项目全景与效能分析"
      >
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex items-start justify-between gap-3 py-3.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FolderKanban className="size-4 text-primary" aria-hidden />
                <h2 className="text-sm font-semibold text-foreground">
                  核心项目协同全景
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                项目状态、协同成员与本周交付物集中查看
              </p>
            </div>
            <Button
              variant="ghost"
              size="small"
              onClick={() => setReportsOpen(true)}
              className="shrink-0"
            >
              查看日志流水 <ArrowRight className="size-3.5" aria-hidden />
            </Button>
          </CardHeader>
          <CardBody className="p-0">
            {breakdown.projects.length ? (
              <div className="divide-y divide-border">
                {breakdown.projects.slice(0, 5).map((project) => (
                  <ProjectSnapshot key={project.id} project={project} />
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

      <Card>
        <CardHeader className="flex items-start justify-between gap-3 py-3.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" aria-hidden />
              <h2 className="text-sm font-semibold text-foreground">
                人员履约状态
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              默认展示需要跟进的成员，点击姓名查看今日计划与实际
            </p>
          </div>
          <Tag color="neutral" className="shrink-0">
            {attentionMembers.length} 人需关注
          </Tag>
        </CardHeader>
        <CardBody className="p-4">
          {attentionMembers.length ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {attentionMembers.map((member) => (
                <Button
                  key={member.id}
                  variant="outline"
                  size="medium"
                  onClick={() => setSelectedMember(member)}
                  className="h-auto min-w-0 justify-start gap-2.5 rounded-lg px-3 py-2.5 text-left"
                >
                  <Avatar initials={member.name.slice(0, 1)} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-foreground">
                        {member.name}
                      </span>
                      <span
                        className={cx(
                          "size-1.5 shrink-0 rounded-full",
                          member.openBlockers ? "bg-destructive" : "bg-warning",
                        )}
                        aria-hidden
                      />
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {member.openBlockers
                        ? `${member.openBlockers} 项阻塞`
                        : member.todaySubmitted
                          ? `计划完成 ${percent(member.todayCompleted, member.todayPlans)}%`
                          : "今日尚未提交"}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Button>
              ))}
            </div>
          ) : (
            <EmptyState text="当前没有需要跟进的成员" />
          )}
          {breakdown.members.length > attentionMembers.length ? (
            <p className="mt-3 text-xs text-muted-foreground">
              另有 {breakdown.members.length - attentionMembers.length}{" "}
              名成员状态正常
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Drawer
        open={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        title={
          selectedMember ? `${selectedMember.name} · 今日明细` : "今日明细"
        }
        description="查看该成员的计划、实际工作和提交状态。"
      >
        {selectedMember ? (
          <MemberDetail member={selectedMember} projectNames={projectNames} />
        ) : null}
      </Drawer>

      <Drawer
        open={reportsOpen}
        onClose={() => setReportsOpen(false)}
        title="日志流水"
        description="按最近提交时间查看团队报告。"
      >
        <List
          dataSource={reports.slice(0, 10)}
          rowKey={(report) => report.id}
          emptyState={<EmptyState text="暂无报告记录" />}
          itemClassName="bg-muted/40"
          renderItem={(report) => (
            <ListItem
              index={report.type === "DAILY" ? "日报" : "周报"}
              title={
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {report.author}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-normal text-muted-foreground">
                    {report.date ?? report.weekStart ?? "未填写日期"} ·{" "}
                    {report.summary || "未填写总结"}
                  </p>
                </div>
              }
              trailing={
                <Badge
                  color={report.status === "SUBMITTED" ? "success" : "warning"}
                >
                  {report.status === "SUBMITTED" ? "已提交" : "草稿"}
                </Badge>
              }
            />
          )}
        />
      </Drawer>
    </div>
  );
}

function ProjectSnapshot({
  project,
}: {
  project: DashboardBreakdown["projects"][number];
}) {
  const total = project.completed + project.inProgress + project.blocked;
  return (
    <article className="px-5 py-4">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {project.name}
            </h3>
            <Badge color={project.blocked ? "danger" : "success"}>
              {project.blocked ? `${project.blocked} 项阻塞` : "运行正常"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            负责人：{project.owner?.name ?? "未设置"} · 本周 {total} 条工作记录
          </p>
        </div>
        <div className="flex shrink-0 -space-x-1.5" aria-label="协同成员">
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
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <Tag color="success">已完成 {project.completed}</Tag>
        <Tag color="info">推进中 {project.inProgress}</Tag>
        <Tag color="neutral">交付物 {project.deliverables.length} 类</Tag>
      </div>
      <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-border pt-3">
        <FileText
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        {project.deliverables.length ? (
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden whitespace-nowrap">
            {project.deliverables.slice(0, 3).map((item) => (
              <Tag
                key={item.unitId}
                color="processing"
                className="max-w-[31%] truncate"
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
          <span className="text-xs text-muted-foreground">暂未登记交付物</span>
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
    <div className="space-y-5">
      <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-muted/50">
        <SummaryCell label="今日计划" value={`${member.todayPlans} 项`} />
        <SummaryCell label="已完成" value={`${member.todayCompleted} 项`} />
        <SummaryCell
          label="提交状态"
          value={member.todaySubmitted ? "已提交" : "未提交"}
        />
      </div>
      <section>
        <h3 className="text-sm font-semibold text-foreground">今日计划</h3>
        <List
          dataSource={member.todayPlanItems}
          rowKey={(item, index) => `plan-${index}-${item.content}`}
          className="mt-2"
          itemClassName="bg-muted/40"
          emptyState={
            <p className="text-xs text-muted-foreground">暂无工作计划</p>
          }
          renderItem={(item, index) => (
            <ListItem
              index={String(index + 1).padStart(2, "0")}
              title={
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {item.content}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.projectId
                      ? (projectNames.get(item.projectId) ?? "未关联项目")
                      : "未关联项目"}{" "}
                    · {item.category}
                  </p>
                </div>
              }
              trailing={<StatusDot status={item.status} />}
            />
          )}
        />
      </section>
      <section>
        <h3 className="text-sm font-semibold text-foreground">今日实际完成</h3>
        <List
          dataSource={member.todayActualItems}
          rowKey={(item, index) => `actual-${index}-${item.content}`}
          className="mt-2"
          itemClassName="bg-card"
          emptyState={
            <p className="text-xs text-muted-foreground">暂无实际工作记录</p>
          }
          renderItem={(item, index) => (
            <ListItem
              index={String(index + 1).padStart(2, "0")}
              title={
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {item.content}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.category}
                  </p>
                </div>
              }
              trailing={
                <Badge color={item.status === "DONE" ? "success" : "warning"}>
                  {statusLabel(item.status)}
                </Badge>
              }
              footer={
                item.deliverables.length ? (
                  <span className="truncate text-xs text-info">
                    产出：{item.deliverables.join(" · ")}
                  </span>
                ) : undefined
              }
            />
          )}
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

function StatusDot({
  status,
}: {
  status: Member["todayPlanItems"][number]["status"];
}) {
  return (
    <span
      className={cx(
        "size-2 shrink-0 rounded-full",
        status === "DONE"
          ? "bg-success"
          : status === "BLOCKED"
            ? "bg-destructive"
            : "bg-warning",
      )}
      title={statusLabel(status)}
      aria-label={statusLabel(status)}
    />
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

function statusLabel(
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED",
) {
  return {
    TODO: "待开始",
    IN_PROGRESS: "进行中",
    BLOCKED: "阻塞",
    DONE: "完成",
    CANCELED: "已取消",
  }[status];
}
