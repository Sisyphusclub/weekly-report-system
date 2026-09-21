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
import { Alert } from "@/components/premium/alert";
import { Avatar } from "@/components/premium/avatar";
import { Badge, Tag } from "@/components/premium/badge";
import { Card, CardBody, CardHeader } from "@/components/premium/cards/card";
import { Drawer } from "@/components/premium/drawer";
import { List, ListItem } from "@/components/premium/list";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/motion/tabs";
import { WorkAnalyticsCharts } from "@/components/dashboard/work-analytics-charts";
import { Button } from "@/components/motion/button/base";
import { ProgressCircle } from "@/components/premium/stats/progress-circle";
import { StatisticCard } from "@/components/premium/stats/statistic-card";
import type { DashboardBreakdown, DashboardMetrics } from "@/lib/metrics";
import { cx } from "@/utils/cx";

type Member = DashboardBreakdown["members"][number];
type Project = DashboardBreakdown["projects"][number];

export function BossDashboard({
  metrics,
  breakdown,
  todaySubmission,
  memberCount,
}: {
  metrics: DashboardMetrics;
  breakdown: DashboardBreakdown;
  todaySubmission: { submitted: number; total: number };
  memberCount: number;
}) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
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
    <div className="mx-auto w-full max-w-7xl">
      <Tabs defaultValue="overview" variant="underline" size="large">
        <div className="border-b border-border">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="overview">
              <ChartNoAxesCombined className="mr-2 size-4" aria-hidden />
              数据与效能大盘
            </TabsTrigger>
            <TabsTrigger value="daily">
              <ClipboardList className="mr-2 size-4" aria-hidden />
              今日全员日报速览
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="flex flex-col gap-4">
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
                                member.openBlockers
                                  ? "bg-destructive"
                                  : "bg-warning",
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
          </div>
        </TabsContent>

        <TabsContent value="daily">
          <DailyOverviewGrid
            members={breakdown.members}
            blockerItems={breakdown.blockerItems}
            projectNames={projectNames}
            onOpenMember={setSelectedMember}
          />
        </TabsContent>
      </Tabs>

      <Drawer
        open={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        title={
          selectedMember ? `${selectedMember.name} · 今日明细` : "今日明细"
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
            ? `${selectedProject.name} · 今日日报流水`
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

function DailyOverviewGrid({
  members,
  blockerItems,
  projectNames,
  onOpenMember,
}: {
  members: DashboardBreakdown["members"];
  blockerItems: DashboardBreakdown["blockerItems"];
  projectNames: Map<string, string>;
  onOpenMember: (member: Member) => void;
}) {
  if (!members.length) return <EmptyState text="暂无团队日报数据" />;

  return (
    <section
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      aria-label="今日全员日报速览"
    >
      {members.map((member, index) => (
        <MemberDailyCard
          key={member.id}
          member={member}
          blockers={blockerItems.filter(
            (item) =>
              item.reporterId === member.id || item.coordinatorId === member.id,
          )}
          projectNames={projectNames}
          avatarClassName={avatarTone(index)}
          onOpen={() => onOpenMember(member)}
        />
      ))}
    </section>
  );
}

function MemberDailyCard({
  member,
  blockers,
  projectNames,
  avatarClassName,
  onOpen,
}: {
  member: Member;
  blockers: DashboardBreakdown["blockerItems"];
  projectNames: Map<string, string>;
  avatarClassName: string;
  onOpen: () => void;
}) {
  const status = member.openBlockers
    ? { color: "danger" as const, label: "阻塞" }
    : member.todaySubmitted
      ? { color: "success" as const, label: "已提交" }
      : { color: "warning" as const, label: "进行中" };

  return (
    <Card className="h-full min-w-0 overflow-hidden">
      {blockers.length ? (
        <Alert
          type="error"
          showIcon
          className="rounded-none border-x-0 border-t-0"
          message={`卡点：${blockers[0].description}`}
          description={
            blockers.length > 1
              ? `另有 ${blockers.length - 1} 项开放阻塞`
              : undefined
          }
        />
      ) : null}
      <CardHeader className="flex items-center justify-between gap-3 py-3">
        <Button
          variant="ghost"
          size="small"
          onClick={onOpen}
          className="-ml-2 h-auto min-w-0 justify-start px-2 py-1"
        >
          <Avatar
            initials={member.name.slice(0, 1)}
            size="md"
            className={avatarClassName}
          />
          <span className="truncate text-sm font-semibold text-foreground">
            {member.name}
          </span>
        </Button>
        <Badge color={status.color}>{status.label}</Badge>
      </CardHeader>
      <CardBody className="space-y-4 p-4">
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-foreground">今日计划</h3>
            <span className="text-xs tabular-nums text-muted-foreground">
              {member.todayPlanItems.length} 项
            </span>
          </div>
          <List
            dataSource={member.todayPlanItems}
            rowKey={(item, itemIndex) =>
              `${member.id}-plan-${itemIndex}-${item.content}`
            }
            className="space-y-0"
            itemClassName="rounded-none border-0 border-b border-border bg-transparent px-0 py-2 last:border-b-0"
            emptyState={
              <p className="text-xs text-muted-foreground">今日暂无计划</p>
            }
            renderItem={(item, itemIndex) => (
              <ListItem
                index={String(itemIndex + 1).padStart(2, "0")}
                title={item.content}
                footer={
                  <span className="truncate text-xs text-muted-foreground">
                    {item.projectId
                      ? (projectNames.get(item.projectId) ?? "未关联项目")
                      : "未关联项目"}
                    {item.category ? ` · ${item.category}` : ""}
                  </span>
                }
              />
            )}
          />
        </section>
        <section className="border-t border-border pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-foreground">实际完成</h3>
            <span className="text-xs tabular-nums text-muted-foreground">
              {member.todayActualItems.length} 项
            </span>
          </div>
          <List
            dataSource={member.todayActualItems}
            rowKey={(item, itemIndex) =>
              `${member.id}-actual-${itemIndex}-${item.content}`
            }
            className="space-y-0"
            itemClassName="rounded-none border-0 border-b border-border bg-transparent px-0 py-2.5 last:border-b-0"
            emptyState={
              <p className="text-xs text-muted-foreground">今日暂无实际工作</p>
            }
            renderItem={(item, itemIndex) => (
              <ListItem
                index={String(itemIndex + 1).padStart(2, "0")}
                title={
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span>{item.content}</span>
                      <Tag color="neutral">{item.category || "未分类"}</Tag>
                    </div>
                  </div>
                }
                footer={
                  item.deliverables.length ? (
                    <div className="flex min-w-0 flex-wrap gap-1">
                      {item.deliverables.map((deliverable) => (
                        <Tag key={deliverable} color="processing">
                          产出：{deliverable.replace(/^产出[：:]\s*/, "")}
                        </Tag>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      未登记产出
                    </span>
                  )
                }
              />
            )}
          />
        </section>
      </CardBody>
    </Card>
  );
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
    return <EmptyState text="今日暂无关联该项目的日报记录" />;
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
            <ProjectEntryGroup title="今日计划" items={plans} />
          ) : null}
          {actuals.length ? (
            <ProjectEntryGroup title="实际完成" items={actuals} actual />
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
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex -space-x-1.5" aria-label="协同成员">
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
          <Button variant="ghost" size="small" onClick={onOpenLogs}>
            查看日志流水 <ArrowRight className="size-3.5" aria-hidden />
          </Button>
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
