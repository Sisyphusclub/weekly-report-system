"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { ChartNoAxesCombined } from "lucide-react";
import { memo, useMemo } from "react";
import { Card, CardBody, CardHeader } from "@/components/premium/cards/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type CategoryDatum = {
  id: string;
  label: string;
  value: number;
};

type DeliverableDatum = CategoryDatum & {
  unit: string;
};

const chartColors = [
  "var(--be-chart-1)",
  "var(--be-chart-2)",
  "var(--be-chart-3)",
  "var(--be-chart-4)",
  "var(--be-chart-5)",
];

export const WorkAnalyticsCharts = memo(function WorkAnalyticsCharts({
  categories,
  deliverables,
  embedded = false,
  periodLabel = "本周",
}: {
  categories: readonly CategoryDatum[];
  deliverables: readonly DeliverableDatum[];
  embedded?: boolean;
  periodLabel?: string;
}) {
  if (embedded) {
    return (
      <Card className="flex h-full min-w-0 flex-col overflow-hidden">
        <CardHeader className="py-3.5">
          <h2 className="text-sm font-semibold text-foreground">
            投入与交付分析
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {periodLabel}工作分类占比与核心产出量
          </p>
        </CardHeader>
        <CardBody className="grid min-h-0 flex-1 grid-rows-2 divide-y divide-border p-0">
          <ChartSection
            title="工作分类与精力投入"
            description="按实际工作条目统计"
          >
            <CategoryDonut data={categories} compact />
          </ChartSection>
          <ChartSection
            title="核心交付物量化统计"
            description="按产出数量降序排列"
          >
            <DeliverableBars data={deliverables} compact />
          </ChartSection>
        </CardBody>
      </Card>
    );
  }

  return (
    <section className="grid gap-5 xl:grid-cols-2" aria-label="工作分析图表">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="py-3.5">
          <h2 className="text-sm font-semibold text-foreground">
            工作分类与精力投入
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            按{periodLabel}已提交日报中的实际工作条目统计
          </p>
        </CardHeader>
        <CardBody className="p-4">
          <CategoryDonut data={categories} />
        </CardBody>
      </Card>
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="py-3.5">
          <h2 className="text-sm font-semibold text-foreground">
            核心交付物量化统计
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            从日报产出物中提取数量并按类型汇总
          </p>
        </CardHeader>
        <CardBody className="p-4">
          <DeliverableBars data={deliverables} />
        </CardBody>
      </Card>
    </section>
  );
});

function ChartSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col px-4 py-3.5">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

const CategoryDonut = memo(function CategoryDonut({
  data: source,
  compact = false,
}: {
  data: readonly CategoryDatum[];
  compact?: boolean;
}) {
  const data = useMemo(
    () =>
      source
        .filter((item) => item.value > 0)
        .slice(0, 5)
        .map((item, index) => ({
          ...item,
          key: `category_${index}`,
          fill: chartColors[index % chartColors.length],
        })),
    [source],
  );
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const config: ChartConfig = Object.fromEntries(
    data.map((item) => [
      item.key,
      {
        label: `${item.label} ${Math.round((item.value / total) * 100)}%`,
        color: item.fill,
      },
    ]),
  );

  if (!data.length) {
    return (
      <ChartEmptyState
        text={`${compact ? "当日" : "本周"}暂无已提交的实际工作`}
        compact={compact}
      />
    );
  }

  if (data.length === 1) {
    return (
      <div
        className="flex min-h-32 items-center justify-between gap-4 border-y border-border py-4"
        aria-label="工作分类统计"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {data[0].label}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">全部实际工作</p>
        </div>
        <p className="shrink-0 text-lg font-semibold tabular-nums text-foreground">
          {total}{" "}
          <span className="text-xs font-normal text-muted-foreground">项</span>
        </p>
      </div>
    );
  }

  return (
    <ChartContainer
      config={config}
      className={compact ? "h-[180px] w-full" : "h-[280px] w-full"}
      aria-label="工作分类占比环形图"
    >
      <PieChart>
        <ChartTooltip
          content={<ChartTooltipContent nameKey="key" hideLabel />}
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="key"
          innerRadius={40}
          outerRadius={58}
          paddingAngle={2}
          stroke="var(--card)"
          strokeWidth={2}
          isAnimationActive={false}
        >
          {data.map((item) => (
            <Cell key={item.key} fill={`var(--color-${item.key})`} />
          ))}
          <Label
            position="center"
            value={`${total} 工作项`}
            className="fill-foreground text-sm font-semibold"
          />
        </Pie>
        <ChartLegend
          verticalAlign="bottom"
          content={
            <ChartLegendContent
              nameKey="key"
              className="!grid !grid-cols-2 !items-start !justify-start !gap-x-3 !gap-y-1.5 !pt-1 text-xs sm:!grid-cols-3"
            />
          }
        />
      </PieChart>
    </ChartContainer>
  );
});

const DeliverableBars = memo(function DeliverableBars({
  data: source,
  compact = false,
}: {
  data: readonly DeliverableDatum[];
  compact?: boolean;
}) {
  const data = useMemo(
    () =>
      [...source]
        .sort((a, b) => b.value - a.value)
        .slice(0, compact ? 6 : 10)
        .map((item) => ({
          ...item,
          displayValue: `${item.value} ${item.unit || "项"}`,
        })),
    [compact, source],
  );
  const config: ChartConfig = {
    value: {
      label: "交付物",
      color: "var(--be-primary)",
    },
  };

  if (!data.length) {
    return (
      <ChartEmptyState
        text={`${compact ? "当日" : "本周"}日报暂未登记量化产出`}
        compact={compact}
      />
    );
  }

  return (
    <ChartContainer
      config={config}
      className={compact ? "h-[180px] w-full" : "h-[280px] w-full"}
      aria-label="核心交付物数量横向排行榜"
    >
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ left: 2, right: 52, top: 4, bottom: 4 }}
      >
        <CartesianGrid
          horizontal={false}
          stroke="var(--be-chart-grid)"
          strokeDasharray="3 3"
        />
        <XAxis dataKey="value" type="number" hide />
        <YAxis
          dataKey="label"
          type="category"
          tickLine={false}
          axisLine={false}
          width={72}
          tick={{ fill: "var(--be-text-regular)", fontSize: 12 }}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          radius={4}
          barSize={14}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="displayValue"
            position="right"
            offset={8}
            className="fill-foreground text-xs font-medium"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
});

function ChartEmptyState({
  text,
  compact = false,
}: {
  text: string;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "grid min-h-[148px] place-items-center rounded-lg border border-dashed border-border bg-muted/30 px-4 text-center"
          : "grid min-h-[240px] place-items-center rounded-lg border border-dashed border-border bg-muted/30 px-4 text-center"
      }
    >
      <div className="grid justify-items-center gap-2">
        <ChartNoAxesCombined
          className="size-5 text-muted-foreground/70"
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">{text}</p>
        <p className="text-xs text-muted-foreground/80">提交日报后自动生成</p>
      </div>
    </div>
  );
}
