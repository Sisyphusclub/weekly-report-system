"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
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

export function WorkAnalyticsCharts({
  categories,
  deliverables,
}: {
  categories: readonly CategoryDatum[];
  deliverables: readonly DeliverableDatum[];
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-2" aria-label="工作分析图表">
      <CategoryDonut data={categories} />
      <DeliverableBars data={deliverables} />
    </section>
  );
}

function CategoryDonut({ data: source }: { data: readonly CategoryDatum[] }) {
  const data = source.filter((item) => item.value > 0).map((item, index) => ({
    ...item,
    key: `category_${index}`,
    fill: chartColors[index % chartColors.length],
  }));
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const config: ChartConfig = Object.fromEntries(
    data.map((item) => [
      item.key,
      { label: item.label, color: item.fill },
    ]),
  );

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="py-3.5">
        <h2 className="text-sm font-semibold text-foreground">工作分类与精力投入</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          按本周已提交日报中的实际工作条目统计
        </p>
      </CardHeader>
      <CardBody className="p-4">
        {data.length ? (
          <div className="relative">
            <ChartContainer
              config={config}
              className="h-[250px] w-full"
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
                  innerRadius="58%"
                  outerRadius="78%"
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {data.map((item) => (
                    <Cell key={item.key} fill={`var(--color-${item.key})`} />
                  ))}
                </Pie>
                <ChartLegend
                  verticalAlign="bottom"
                  content={
                    <ChartLegendContent
                      nameKey="key"
                      className="!grid !grid-cols-2 !gap-x-4 !gap-y-2 !pt-1 text-xs"
                    />
                  }
                />
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-x-0 top-[76px] text-center">
              <p className="text-2xl font-semibold tabular-nums text-foreground">{total}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">工作项</p>
            </div>
          </div>
        ) : (
          <ChartEmptyState text="本周暂无已提交的实际工作" />
        )}
      </CardBody>
    </Card>
  );
}

function DeliverableBars({ data: source }: { data: readonly DeliverableDatum[] }) {
  const data = [...source]
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((item) => ({
      ...item,
      displayValue: `${item.value} ${item.unit || "项"}`,
    }));
  const config: ChartConfig = {
    value: {
      label: "交付物",
      color: "var(--be-primary)",
    },
  };

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="py-3.5">
        <h2 className="text-sm font-semibold text-foreground">核心交付物量化统计</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          从日报产出物中提取数量并按类型汇总
        </p>
      </CardHeader>
      <CardBody className="p-4">
        {data.length ? (
          <ChartContainer config={config} className="h-[250px] w-full" aria-label="核心交付物数量横向排行榜">
            <BarChart
              accessibilityLayer
              data={data}
              layout="vertical"
              margin={{ left: 2, right: 48, top: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} stroke="var(--be-chart-grid)" strokeDasharray="3 3" />
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
              <Bar dataKey="value" fill="var(--color-value)" radius={4} barSize={14}>
                <LabelList
                  dataKey="displayValue"
                  position="right"
                  offset={8}
                  className="fill-slate-700 text-xs font-medium"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <ChartEmptyState text="本周日报暂未登记量化产出" />
        )}
      </CardBody>
    </Card>
  );
}

function ChartEmptyState({ text }: { text: string }) {
  return (
    <div className="grid min-h-[250px] place-items-center rounded-lg border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
