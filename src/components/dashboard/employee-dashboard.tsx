"use client";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FileText,
  Gauge,
} from "lucide-react";
import { Badge } from "@/components/premium/badge";
import { ButtonLink } from "@/components/motion/button/base";
import { Card, CardBody, CardHeader } from "@/components/premium/cards/card";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/premium/data-table";
import type { DailyEntry } from "@/lib/daily-input";
import { cx } from "@/utils/cx";

type RecentReport = {
  id: string;
  type: "DAILY" | "WEEKLY";
  date: string | null;
  weekStart: string | null;
  summary: string | null;
  deliverableSummary: string;
  status: "DRAFT" | "SUBMITTED";
};

const reportColumns: DataTableColumn<RecentReport>[] = [
  {
    key: "report",
    header: "报告类型与日期",
    width: "14rem",
    cell: (item) => (
      <div className="flex min-w-0 items-center gap-2.5">
        <Badge
          variant="caption"
          color={item.type === "DAILY" ? "blue" : "purple"}
        >
          {item.type === "DAILY" ? "日报" : "周报"}
        </Badge>
        <time className="truncate font-mono font-semibold text-foreground tabular-nums">
          {item.date ?? item.weekStart ?? "未设置日期"}
        </time>
      </div>
    ),
  },
  {
    key: "summary",
    header: "工作内容摘要",
    width: "24rem",
    cell: (item) => (
      <p className="truncate text-foreground">
        {item.summary || "未填写补充说明"}
      </p>
    ),
  },
  {
    key: "deliverables",
    header: "交付物",
    width: "14rem",
    cell: (item) => (
      <span
        className={cx(
          "truncate",
          item.deliverableSummary === "未登记"
            ? "text-slate-400"
            : "text-slate-600",
        )}
      >
        {item.deliverableSummary}
      </span>
    ),
  },
  {
    key: "status",
    header: "状态",
    width: "8rem",
    cell: (item) => (
      <Badge
        variant="caption"
        color="soft"
        showIcon={false}
        className={cx(
          item.status === "SUBMITTED"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-amber-200 bg-amber-50 text-amber-700",
        )}
      >
        {item.status === "SUBMITTED" ? (
          <>
            <CheckCircle2 className="size-3" aria-hidden />
            已提交
          </>
        ) : (
          <>
            <FileText className="size-3" aria-hidden />
            草稿
          </>
        )}
      </Badge>
    ),
  },
  {
    key: "actions",
    header: "操作",
    width: "6rem",
    cell: (item) => (
      <ButtonLink href={`/reports/${item.id}`} variant="ghost" size="small">
        查看
        <ArrowRight className="size-3.5" aria-hidden />
      </ButtonLink>
    ),
  },
];

export function EmployeeDashboard({
  name,
  today,
  plans,
  works,
  submitted,
  openBlockers,
  recentReports,
}: {
  name: string;
  today: string;
  plans: DailyEntry[];
  works: DailyEntry[];
  submitted: boolean;
  openBlockers: number;
  recentReports: RecentReport[];
}) {
  const completedPlans = plans.filter((item) => item.status === "DONE").length;
  const completedWorks = works.filter((item) => item.status === "DONE").length;
  const fulfillment = plans.length
    ? Math.round((completedPlans / plans.length) * 100)
    : 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary">
            {today} · 我的工作
          </p>
          <h1 className="mt-1.5 text-2xl font-bold text-foreground">
            你好，{name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            查看今天的计划、完成内容和待协调卡点。
          </p>
        </div>
        <ButtonLink
          href="/daily"
          variant={submitted ? "secondary" : "primary"}
          size="medium"
        >
          <ClipboardCheck className="size-4" aria-hidden />
          {submitted ? "查看今日日报" : "填写今日日报"}
        </ButtonLink>
      </header>

      <section
        aria-label="今日指标概览"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        <MetricStat
          icon={CalendarDays}
          label="今日计划数"
          value={plans.length}
          suffix="项"
          tone="info"
        />
        <MetricStat
          icon={CheckCircle2}
          label="今日已完成"
          value={completedWorks}
          suffix="项"
          tone="success"
        />
        <MetricStat
          icon={Gauge}
          label="今日达成率"
          value={fulfillment}
          suffix="%"
          progress={fulfillment}
        />
        <MetricStat
          icon={CircleAlert}
          label="待协调卡点"
          value={openBlockers}
          suffix="项"
          danger={openBlockers > 0}
          href={openBlockers > 0 ? "/blockers" : undefined}
        />
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              今日计划与实际
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {completedPlans}/{plans.length} 项计划已核销，达成率 {fulfillment}
              %
            </p>
          </div>
          <ButtonLink href="/daily" variant="secondary" size="small">
            编辑今日日报
          </ButtonLink>
        </CardHeader>
        {openBlockers > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200 bg-rose-50 px-5 py-2.5 text-rose-700">
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-rose-700 text-white shadow-sm">
                <CircleAlert className="size-3.5" aria-hidden />
              </span>
              {openBlockers} 项卡点正在等待协调
            </span>
            <ButtonLink
              href="/blockers"
              variant="ghost"
              size="small"
              className="text-rose-700 hover:bg-rose-700 hover:text-white"
            >
              查看卡点
              <ArrowRight className="size-3.5" aria-hidden />
            </ButtonLink>
          </div>
        ) : null}
        <CardBody className="grid min-w-0 p-0 lg:grid-cols-2 lg:divide-x lg:divide-border">
          <WorkColumn
            title="今日工作计划"
            entries={plans}
            empty="今天还没有工作计划"
            kind="plan"
          />
          <WorkColumn
            title="今日实际完成"
            entries={works}
            empty="还没有实际完成内容"
            kind="work"
          />
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" aria-hidden />
            <h2 className="text-base font-semibold text-foreground">
              最近报告
            </h2>
          </div>
          <ButtonLink href="/reports" variant="ghost" size="small">
            查看全部
            <ArrowRight className="size-3.5" aria-hidden />
          </ButtonLink>
        </CardHeader>
        <CardBody className="p-0">
          {recentReports.length ? (
            <DataTable
              columns={reportColumns}
              data={recentReports.slice(0, 5)}
              getRowId={(item) => item.id}
            />
          ) : (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              提交日报后，报告会显示在这里。
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function WorkColumn({
  title,
  entries,
  empty,
  kind,
}: {
  title: string;
  entries: DailyEntry[];
  empty: string;
  kind: "plan" | "work";
}) {
  return (
    <section className="min-w-0 border-b border-border p-5 last:border-b-0 lg:border-b-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">
          {entries.length} 项
        </span>
      </div>
      {entries.length ? (
        <ol className="divide-y divide-border/70">
          {entries.slice(0, 8).map((entry, index) => (
            <li key={index} className="group min-w-0 py-2.5">
              <div className="grid min-w-0 grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-x-2">
                <span className="text-xs font-semibold tabular-nums text-slate-500">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="min-w-0 truncate text-sm font-medium text-slate-800">
                  {entry.content}
                </p>
                {kind === "plan" ? (
                  <ButtonLink
                    href="/daily"
                    variant="ghost"
                    size="xs"
                    className="h-auto shrink-0 rounded bg-blue-50 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                    aria-label={`核销完成：${entry.content}`}
                  >
                    核销完成
                    <ArrowRight className="size-3.5" aria-hidden />
                  </ButtonLink>
                ) : (
                  <CategoryBadge>{entry.category}</CategoryBadge>
                )}
              </div>
              {kind === "plan" ? (
                <div className="mt-1.5 ml-8 flex min-w-0 items-center">
                  <CategoryBadge>{entry.category}</CategoryBadge>
                </div>
              ) : (
                <div className="mt-1.5 ml-8 flex min-w-0 items-center justify-between gap-2">
                  <span
                    className={cx(
                      "min-w-0 truncate rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700",
                      !entry.deliverables.length &&
                        "bg-slate-50 text-slate-400",
                    )}
                  >
                    产出：{entry.deliverables.join("、") || "未登记"}
                  </span>
                  <span
                    className={cx(
                      "shrink-0 rounded-full px-2 py-1 text-xs font-medium",
                      entry.status === "DONE"
                        ? "bg-emerald-50 text-emerald-700"
                        : entry.status === "BLOCKED"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {statusText(entry.status)}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <div className="grid min-h-36 place-items-center rounded-lg border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
          {empty}
        </div>
      )}
    </section>
  );
}

function MetricStat({
  icon: Icon,
  label,
  value,
  suffix,
  tone = "neutral",
  progress,
  danger = false,
  href,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: number;
  suffix: string;
  tone?: "neutral" | "info" | "success";
  progress?: number;
  danger?: boolean;
  href?: string;
}) {
  const content = (
    <Card
      className={cx(
        "h-full",
        danger && "border-rose-200 bg-rose-50 text-rose-700",
      )}
    >
      <CardBody className="flex h-full items-center gap-4">
        <span
          className={cx(
            "grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground",
            tone === "info" &&
              "bg-status-blue-background text-status-blue-text",
            tone === "success" &&
              "border border-emerald-200 bg-emerald-50 text-emerald-700",
            danger && "border border-rose-700 bg-rose-700 text-white shadow-sm",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cx(
              "text-xs text-muted-foreground",
              danger && "text-rose-700",
            )}
          >
            {label}
          </p>
          <p
            className={cx(
              "mt-1 text-2xl font-bold tabular-nums text-foreground",
              danger && "text-rose-700",
            )}
          >
            {value}
            <span className="ml-1 text-sm font-medium">{suffix}</span>
          </p>
          {progress !== undefined ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          ) : null}
        </div>
        {href ? <ArrowRight className="size-4 shrink-0" aria-hidden /> : null}
      </CardBody>
    </Card>
  );
  return href ? (
    <a
      href={href}
      className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {content}
    </a>
  ) : (
    content
  );
}

function CategoryBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex max-w-28 items-center truncate rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function statusText(status: DailyEntry["status"]) {
  return {
    TODO: "未开始",
    IN_PROGRESS: "进行中",
    DONE: "已完成",
    BLOCKED: "阻塞",
    CANCELED: "已取消",
  }[status];
}
