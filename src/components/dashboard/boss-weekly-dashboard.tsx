"use client";

import {
  CalendarClock,
  CircleAlert,
  CircleCheck,
  Clock3,
  FileCheck2,
  ListChecks,
  Users,
} from "lucide-react";
import { ButtonLink } from "@/components/motion/button/base";
import { Badge, type BadgeTone } from "@/components/premium/badge";
import { Card, CardBody, CardHeader } from "@/components/premium/cards/card";
import {
  ResponsiveDataTable,
  type ResponsiveDataTableColumn,
} from "@/components/premium/responsive-data-table";
import { StatisticCard } from "@/components/premium/stats/statistic-card";
import { cx } from "@/utils/cx";

export type BossWeeklyMember = {
  id: string;
  name: string;
  title: string | null;
  weeklyStatus: "SUBMITTED" | "DRAFT" | "MISSING";
  reportId: string | null;
  summary: string;
  dailySubmitted: number;
  dailyExpected: number;
  completedTasks: number;
  inProgressTasks: number;
  openBlockers: number;
};

export type BossWeeklyStats = {
  totalMembers: number;
  submitted: number;
  draft: number;
  missing: number;
  submissionRate: number;
  dailySubmitted: number;
  dailyExpected: number;
  dailyRate: number;
  completedTasks: number;
  inProgressTasks: number;
  openBlockers: number;
};

type BossWeeklyDashboardProps = {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  members: BossWeeklyMember[];
  stats: BossWeeklyStats;
};

const statusMeta: Record<
  BossWeeklyMember["weeklyStatus"],
  { label: string; tone: BadgeTone }
> = {
  SUBMITTED: { label: "已提交", tone: "success" },
  DRAFT: { label: "草稿", tone: "warning" },
  MISSING: { label: "未提交", tone: "danger" },
};

export function BossWeeklyDashboard({
  weekStart,
  weekEnd,
  weekLabel,
  members,
  stats,
}: BossWeeklyDashboardProps) {
  const followUpMembers = members.filter(
    (member) => member.weeklyStatus !== "SUBMITTED" || member.openBlockers > 0,
  );

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatisticCard
          icon={Users}
          label="团队成员"
          value={stats.totalMembers}
          suffix="人"
          compact
        />
        <StatisticCard
          icon={FileCheck2}
          label="已提交周报"
          value={stats.submitted}
          suffix={`人 · ${stats.submissionRate}%`}
          progress={stats.submissionRate}
          tone="success"
          compact
        />
        <StatisticCard
          icon={Clock3}
          label="待跟进"
          value={stats.draft + stats.missing}
          suffix={`人 · 草稿 ${stats.draft}`}
          tone={stats.draft + stats.missing ? "danger" : "neutral"}
          compact
        />
        <StatisticCard
          icon={ListChecks}
          label="日报完成度"
          value={stats.dailySubmitted}
          suffix={`/ ${stats.dailyExpected} · ${stats.dailyRate}%`}
          progress={stats.dailyRate}
          tone="info"
          compact
        />
        <StatisticCard
          icon={CircleAlert}
          label="开放阻塞"
          value={stats.openBlockers}
          suffix="项"
          tone={stats.openBlockers ? "danger" : "neutral"}
          compact
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                团队提交进度
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(weekStart)} — {formatDate(weekEnd)} ·
                周五为本周期归档日
              </p>
            </div>
            <Badge color={stats.submissionRate === 100 ? "success" : "info"}>
              {stats.submissionRate}% 完成
            </Badge>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">周报提交率</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {stats.submitted} / {stats.totalMembers}
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="周报提交率"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={stats.submissionRate}
              >
                <div
                  className="h-full rounded-full bg-success transition-[width] duration-300"
                  style={{ width: `${stats.submissionRate}%` }}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <ProgressSummary
                icon={CircleCheck}
                label="已提交"
                value={stats.submitted}
                tone="success"
              />
              <ProgressSummary
                icon={Clock3}
                label="草稿"
                value={stats.draft}
                tone="warning"
              />
              <ProgressSummary
                icon={CircleAlert}
                label="未提交"
                value={stats.missing}
                tone="danger"
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" aria-hidden />
              <h2 className="text-base font-semibold text-foreground">
                本周产出
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              从已提交日报的实际工作中汇总
            </p>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-3">
            <OutputMetric label="已完成任务" value={stats.completedTasks} />
            <OutputMetric label="推进中任务" value={stats.inProgressTasks} />
            <OutputMetric label="日报已提交" value={stats.dailySubmitted} />
            <OutputMetric label="待跟进成员" value={followUpMembers.length} />
          </CardBody>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              成员周报状态
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              查看每位成员的周报提交、日报完成和阻塞情况
            </p>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {members.length} 位成员
          </span>
        </CardHeader>
        <CardBody className="p-0">
          <ResponsiveDataTable
            data={members}
            columns={weeklyColumns}
            getRowId={(row) => row.id}
            defaultSort={{ key: "status", direction: "asc" }}
            defaultVisibleColumns={[
              "member",
              "status",
              "daily",
              "summary",
              "blockers",
              "actions",
            ]}
            search={{
              placeholder: "搜索成员或周报摘要",
              getSearchText: (row) =>
                `${row.name} ${row.title ?? ""} ${row.summary}`,
            }}
            emptyState="本周期还没有团队成员数据"
            tableClassName="border-0"
          />
        </CardBody>
      </Card>

      {followUpMembers.length ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CircleAlert className="size-4 text-warning" aria-hidden />
              <h2 className="text-base font-semibold text-foreground">
                待跟进
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              优先处理未提交周报和仍有开放阻塞的成员
            </p>
          </CardHeader>
          <CardBody className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {followUpMembers.map((member) => (
              <div
                key={member.id}
                className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                    {member.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {member.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {member.weeklyStatus === "SUBMITTED"
                        ? "周报已提交"
                        : statusMeta[member.weeklyStatus].label}
                      {member.openBlockers
                        ? ` · 阻塞 ${member.openBlockers} 项`
                        : ""}
                    </p>
                  </div>
                </div>
                {member.reportId ? (
                  <ButtonLink
                    href={`/reports/${member.reportId}`}
                    variant="ghost"
                    size="small"
                    className="shrink-0"
                  >
                    查看
                  </ButtonLink>
                ) : null}
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <p className="text-xs text-muted-foreground">
        周报周期：{formatDate(weekStart)} — {formatDate(weekEnd)} · 归档日：
        {formatDate(weekLabel)}
      </p>
    </div>
  );
}

const weeklyColumns: ResponsiveDataTableColumn<BossWeeklyMember>[] = [
  {
    key: "member",
    header: "成员",
    label: "成员",
    hideable: false,
    sortable: true,
    width: "15rem",
    sortValue: (row) => row.name,
    cell: (row) => (
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
          {row.name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{row.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.title || "团队成员"}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "status",
    header: "周报状态",
    label: "周报状态",
    sortable: true,
    width: "9rem",
    sortValue: (row) => row.weeklyStatus,
    cell: (row) => {
      const meta = statusMeta[row.weeklyStatus];
      return <Badge color={meta.tone}>{meta.label}</Badge>;
    },
  },
  {
    key: "daily",
    header: "日报完成",
    label: "日报完成",
    sortable: true,
    width: "11rem",
    sortValue: (row) => row.dailySubmitted / Math.max(1, row.dailyExpected),
    cell: (row) => {
      const rate = percent(row.dailySubmitted, row.dailyExpected);
      return (
        <div className="min-w-32">
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="tabular-nums text-foreground">
              {row.dailySubmitted} / {row.dailyExpected} 天
            </span>
            <span className="tabular-nums text-muted-foreground">{rate}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cx(
                "h-full rounded-full",
                rate === 100 ? "bg-success" : "bg-primary",
              )}
              style={{ width: `${rate}%` }}
            />
          </div>
        </div>
      );
    },
  },
  {
    key: "summary",
    header: "周报摘要",
    label: "周报摘要",
    width: "24rem",
    cell: (row) => (
      <p className="whitespace-normal break-words text-sm leading-5 text-muted-foreground">
        {row.summary || "暂未填写周报摘要"}
      </p>
    ),
  },
  {
    key: "blockers",
    header: "阻塞",
    label: "阻塞",
    sortable: true,
    width: "6rem",
    sortValue: (row) => row.openBlockers,
    cell: (row) => (
      <span
        className={cx(
          "tabular-nums",
          row.openBlockers
            ? "font-semibold text-destructive"
            : "text-muted-foreground",
        )}
      >
        {row.openBlockers || "—"}
      </span>
    ),
  },
  {
    key: "actions",
    header: "操作",
    label: "操作",
    hideable: false,
    width: "7rem",
    cell: (row) =>
      row.reportId ? (
        <ButtonLink
          href={`/reports/${row.reportId}`}
          variant="outline"
          size="sm"
        >
          查看周报
        </ButtonLink>
      ) : (
        <span className="text-xs text-muted-foreground">等待提交</span>
      ),
  },
];

function ProgressSummary({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CircleCheck;
  label: string;
  value: number;
  tone: BadgeTone;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      <Icon className={cx("size-4", toneText[tone])} aria-hidden />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

function OutputMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

const toneText: Record<BadgeTone, string> = {
  neutral: "text-muted-foreground",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  processing: "text-info",
};

function percent(value: number, total: number) {
  return total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
}

function formatDate(value: string) {
  const [, month, day] = value.split("-");
  return `${Number(month)}月${Number(day)}日`;
}
