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
import { PageHeading } from "@/components/dashboard/page-heading";
import { ButtonLink } from "@/components/motion/button/base";
import { Alert } from "@/components/premium/alert";
import { Badge, Tag } from "@/components/premium/badge";
import { Card, CardBody, CardHeader } from "@/components/premium/cards/card";
import { Col, Inline, Row } from "@/components/premium/layout";
import { List, ListItem } from "@/components/premium/list";
import { StatisticCard } from "@/components/premium/stats/statistic-card";
import { Table, type TableColumn } from "@/components/premium/table";
import type { DailyEntry } from "@/lib/daily-input";

type RecentReport = {
  id: string;
  type: "DAILY" | "WEEKLY";
  date: string | null;
  weekStart: string | null;
  summary: string | null;
  deliverableSummary: string;
  status: "DRAFT" | "SUBMITTED";
};

const reportColumns: TableColumn<RecentReport>[] = [
  {
    key: "report",
    title: "报告类型与日期",
    width: "14rem",
    render: (item) => (
      <Inline gap="sm" className="whitespace-nowrap">
        <Tag tone={item.type === "DAILY" ? "info" : "neutral"}>
          {item.type === "DAILY" ? "日报" : "周报"}
        </Tag>
        <time className="truncate font-mono font-semibold text-foreground tabular-nums">
          {item.date ?? item.weekStart ?? "未设置日期"}
        </time>
      </Inline>
    ),
  },
  {
    key: "summary",
    title: "工作内容摘要",
    width: "24rem",
    render: (item) => (
      <p className="truncate text-foreground">
        {item.summary || "未填写补充说明"}
      </p>
    ),
  },
  {
    key: "deliverables",
    title: "交付物",
    width: "14rem",
    render: (item) => (
      <p
        className={
          item.deliverableSummary === "未登记"
            ? "truncate text-muted-foreground"
            : "truncate text-foreground"
        }
      >
        {item.deliverableSummary}
      </p>
    ),
  },
  {
    key: "status",
    title: "状态",
    width: "8rem",
    render: (item) =>
      item.status === "SUBMITTED" ? (
        <Badge
          status="success"
          text="已提交"
          className="border-success-border bg-success-subtle text-success"
        />
      ) : (
        <Badge
          status="warning"
          text="草稿"
          className="border-warning-border bg-warning-subtle text-warning"
        />
      ),
  },
  {
    key: "actions",
    title: "操作",
    width: "6rem",
    render: (item) => (
      <ButtonLink
        href={`/reports/${item.id}`}
        variant="ghost"
        size="small"
        trailingIcon={ArrowRight}
      >
        查看
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
    <section className="flex w-full min-w-0 flex-col gap-6">
      <PageHeading
        eyebrow={`${today} · 我的工作`}
        title={`你好，${name}`}
        description="查看今天的计划、完成内容和待协调卡点。"
        actions={
          <ButtonLink
            href="/daily"
            variant={submitted ? "secondary" : "primary"}
            size="medium"
            leadingIcon={ClipboardCheck}
          >
            {submitted ? "查看今日日报" : "填写今日日报"}
          </ButtonLink>
        }
      />

      <Row gap="md" aria-label="今日指标概览">
        <Col span={12} xl={3}>
          <StatisticCard
            icon={CalendarDays}
            label="今日计划数"
            value={plans.length}
            suffix="项"
            tone="info"
          />
        </Col>
        <Col span={12} xl={3}>
          <StatisticCard
            icon={CheckCircle2}
            label="今日已完成"
            value={completedWorks}
            suffix="项"
            tone="success"
          />
        </Col>
        <Col span={12} xl={3}>
          <StatisticCard
            icon={Gauge}
            label="今日达成率"
            value={fulfillment}
            suffix="%"
            progress={fulfillment}
          />
        </Col>
        <Col span={12} xl={3}>
          <StatisticCard
            icon={CircleAlert}
            label="待协调卡点"
            value={openBlockers}
            suffix="项"
            tone={openBlockers > 0 ? "danger" : "neutral"}
            href={openBlockers > 0 ? "/blockers" : undefined}
          />
        </Col>
      </Row>

      <Card className="overflow-hidden border-border/80 shadow-xs">
        <CardHeader className="bg-muted/25">
          <Inline justify="between" gap="md" wrap>
            <section>
              <h2 className="text-base font-semibold text-foreground">
                今日计划与实际
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {completedPlans}/{plans.length} 项计划已核销，达成率 {fulfillment}%
              </p>
            </section>
            <ButtonLink href="/daily" variant="secondary" size="small">
              编辑今日日报
            </ButtonLink>
          </Inline>
        </CardHeader>

        {openBlockers > 0 ? (
          <Alert
            type="warning"
            showIcon
            message={`${openBlockers} 项卡点待协调`}
            className="rounded-none border-x-0 border-t-0 bg-warning-subtle/65"
            action={
              <ButtonLink
                href="/blockers"
                variant="ghost"
                size="small"
                trailingIcon={ArrowRight}
                className="text-warning hover:bg-warning hover:text-card"
              >
                查看卡点
              </ButtonLink>
            }
          />
        ) : null}

        <CardBody className="p-0">
          <Row>
            <Col span={12} lg={6} className="bg-info-subtle/15">
              <WorkColumn
                title="今日工作计划"
                entries={plans}
                empty="今天还没有工作计划"
                kind="plan"
              />
            </Col>
            <Col
              span={12}
              lg={6}
              className="border-t border-border bg-success-subtle/15 lg:border-t-0 lg:border-l"
            >
              <WorkColumn
                title="今日实际完成"
                entries={works}
                empty="还没有实际完成内容"
                kind="work"
              />
            </Col>
          </Row>
        </CardBody>
      </Card>

      <Card className="overflow-hidden border-border/80 shadow-xs">
        <CardHeader className="bg-muted/25">
          <Inline justify="between" gap="md">
            <Inline gap="sm">
              <FileText className="size-4 text-primary" aria-hidden />
              <h2 className="text-base font-semibold text-foreground">
                最近报告
              </h2>
            </Inline>
            <ButtonLink
              href="/reports"
              variant="ghost"
              size="small"
              trailingIcon={ArrowRight}
            >
              查看全部
            </ButtonLink>
          </Inline>
        </CardHeader>
        <CardBody className="p-0">
          <Table
            columns={reportColumns}
            dataSource={recentReports.slice(0, 5)}
            rowKey="id"
            size="small"
            emptyState="提交日报后，报告会显示在这里。"
          />
        </CardBody>
      </Card>
    </section>
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
    <section className="min-w-0 p-5">
      <Inline justify="between" className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{entries.length} 项</p>
      </Inline>

      <List
        dataSource={entries.slice(0, 8)}
        rowKey={(entry, index) => `${entry.content}-${index}`}
        emptyState={empty}
        itemClassName={
          kind === "plan"
            ? "border-info-border/70 border-l-2 bg-info-subtle/30 shadow-none"
            : "border-success-border/70 border-l-2 bg-card shadow-xs"
        }
        renderItem={(entry, index) => (
          <ListItem
            index={String(index + 1).padStart(2, "0")}
            title={entry.content}
            trailing={
              kind === "plan" ? (
                <ButtonLink
                  href="/daily"
                  variant="ghost"
                  size="xs"
                  trailingIcon={ArrowRight}
                  className="h-auto shrink-0 rounded bg-info-subtle px-2 py-1 text-xs text-info hover:bg-info-subtle/80 hover:text-info"
                  aria-label={`核销完成：${entry.content}`}
                >
                  核销完成
                </ButtonLink>
              ) : (
                <Tag tone="neutral">{entry.category}</Tag>
              )
            }
            footer={
              kind === "plan" ? (
                <Tag tone="neutral">{entry.category}</Tag>
              ) : (
                <>
                  <Tag
                    tone={entry.deliverables.length ? "info" : "neutral"}
                    className="max-w-full rounded-md"
                  >
                    产出：{entry.deliverables.join("、") || "未登记"}
                  </Tag>
                  <WorkStatusBadge status={entry.status} />
                </>
              )
            }
          />
        )}
      />
    </section>
  );
}

function WorkStatusBadge({ status }: { status: DailyEntry["status"] }) {
  const config = {
    TODO: { status: "neutral", text: "未开始", className: "" },
    IN_PROGRESS: { status: "info", text: "进行中", className: "" },
    DONE: {
      status: "success",
      text: "已完成",
      className: "border-success-border bg-success-subtle text-success",
    },
    BLOCKED: {
      status: "danger",
      text: "阻塞",
      className: "border-danger-border bg-danger-subtle text-destructive",
    },
    CANCELED: { status: "neutral", text: "已取消", className: "" },
  } as const;
  const current = config[status];

  return (
    <Badge
      status={current.status}
      text={current.text}
      className={current.className}
    />
  );
}
