"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardBody, CardHeader } from "@/components/premium/cards/card";
import { EASE_OUT } from "@/lib/ease";
import { cx } from "@/utils/cx";

const CHART_COLORS = [
  "var(--be-chart-1)",
  "var(--be-chart-2)",
  "var(--be-chart-3)",
  "var(--be-chart-4)",
  "var(--be-chart-5)",
] as const;

export type ChartDatum = {
  name: string;
  value: number;
  unit?: string;
  detail?: string;
};

export function ChartCard({
  title,
  description,
  icon,
  meta,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cx("h-[320px] min-w-0 overflow-hidden", className)}>
      <CardHeader className="flex min-h-[61px] items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">
            {title}
          </h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {meta ? (
            <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium tabular-nums text-muted-foreground">
              {meta}
            </span>
          ) : null}
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        </div>
      </CardHeader>
      <CardBody className={cx("h-[259px] min-h-0 py-3", bodyClassName)}>
        {children}
      </CardBody>
    </Card>
  );
}

export function DonutBreakdownChart({
  data,
  emptyText = "暂无分布数据",
}: {
  data: ChartDatum[];
  emptyText?: string;
}) {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data],
  );
  const selected = data.find((item) => item.name === selectedName) ?? null;

  if (!data.length) return <ChartEmpty text={emptyText} />;

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(116px,0.62fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_160px]">
      <div className="relative h-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart accessibilityLayer>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="79%"
              paddingAngle={3}
              stroke="var(--be-bg-card)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((item, index) => (
                <Cell
                  key={item.name}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  opacity={!selected || selected.name === item.name ? 1 : 0.28}
                  className="cursor-pointer outline-none transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip suffix="项" />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <motion.div
            key={selected?.name ?? "total"}
            initial={reduceMotion ? false : { opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
          >
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {selected?.value ?? total}
            </p>
            <p className="mt-0.5 max-w-24 truncate text-[11px] text-muted-foreground">
              {selected?.name ?? "实际工作条目"}
            </p>
            {selected ? (
              <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                {total ? Math.round((selected.value / total) * 100) : 0}%
              </p>
            ) : null}
          </motion.div>
        </div>
      </div>
      <div className="min-w-0 space-y-1.5">
        {data.slice(0, 5).map((item, index) => {
          const share = total ? Math.round((item.value / total) * 100) : 0;
          const active = selected?.name === item.name;
          return (
            <button
              key={item.name}
              type="button"
              aria-pressed={active}
              onClick={() =>
                setSelectedName((current) =>
                  current === item.name ? null : item.name,
                )
              }
              className={cx(
                "flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs outline-none transition-colors",
                "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                active && "bg-muted",
              )}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                }}
              />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {item.name}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">
                {share}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function HorizontalMetricChart({
  data,
  emptyText = "暂无量化数据",
}: {
  data: ChartDatum[];
  emptyText?: string;
}) {
  const reduceMotion = useReducedMotion();
  if (!data.length) return <ChartEmpty text={emptyText} />;

  const chartData = data.slice(0, 7).map((item) => ({
    ...item,
    displayValue: `${item.value}${item.unit ? ` ${item.unit}` : ""}`,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 42, bottom: 2, left: 8 }}
        accessibilityLayer
      >
        <CartesianGrid
          horizontal={false}
          stroke="var(--be-chart-grid)"
          strokeDasharray="3 4"
        />
        <XAxis
          type="number"
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--be-text-secondary)", fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={104}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--be-text-regular)", fontSize: 11 }}
          tickFormatter={(value: string) =>
            value.length > 10 ? `${value.slice(0, 10)}…` : value
          }
        />
        <Tooltip
          cursor={{ fill: "var(--be-bg-muted)", opacity: 0.55 }}
          content={<ChartTooltip />}
        />
        <Bar
          dataKey="value"
          fill="var(--be-chart-1)"
          radius={[0, 5, 5, 0]}
          barSize={18}
          background={{ fill: "var(--be-bg-muted)", radius: 5 }}
          isAnimationActive={!reduceMotion}
          animationDuration={520}
        >
          <LabelList
            dataKey="displayValue"
            position="right"
            fill="var(--be-text-regular)"
            fontSize={11}
            fontWeight={600}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChartTooltip({
  active,
  payload,
  suffix = "",
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    payload?: ChartDatum;
  }>;
  suffix?: string;
}) {
  const item = payload?.[0];
  if (!active || !item) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
      <p className="text-xs font-medium text-foreground">
        {item.payload?.name ?? item.name}
      </p>
      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
        {Number(item.value ?? 0).toLocaleString("zh-CN")}
        {item.payload?.unit ? ` ${item.payload.unit}` : suffix}
      </p>
    </div>
  );
}

function ChartEmpty({ text }: { text: string }) {
  return (
    <div className="grid h-full place-items-center rounded-lg border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
