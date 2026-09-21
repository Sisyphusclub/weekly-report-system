"use client";

import { ArrowDown, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import {
  Bar,
  BarChart,
  type BarShapeProps,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/motion/button/base";
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

// Source: BEUI Pro Registry @beui-pro/conversion-funnel-overview.
// The labels and values are supplied by the dashboard; the chart geometry,
// selection behavior, tooltip, and motion stay official.
const FUNNEL_COLORS = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa"];

export type FunnelStage = {
  id: string;
  label: string;
  value: number;
  detail: string;
};

export type FunnelPeriod = {
  id: string;
  label: string;
  stages: readonly FunnelStage[];
};

export type ConversionFunnelProps = {
  periods: readonly FunnelPeriod[];
  title?: string;
  description?: string;
  valueLabel?: string;
  valueSuffix?: string;
  className?: string;
};

function FlowStage({
  geometry,
  stages,
  selected,
}: {
  geometry: BarShapeProps;
  stages: readonly FunnelStage[];
  selected: boolean;
}) {
  const reduce = useReducedMotion();
  const { x, width, index, parentViewBox } = geometry;
  const first = Math.max(1, stages[0]?.value ?? 1);
  const ratio = Math.max(0, (stages[index]?.value ?? 0) / first);
  const nextRatio = Math.max(
    0,
    (stages[index + 1]?.value ?? stages[index]?.value ?? 0) / first,
  );
  const center = parentViewBox.y + parentViewBox.height / 2;
  const maxHalf = parentViewBox.height * 0.38;
  const leftHalf = Math.min(1, ratio) * maxHalf;
  const rightHalf = Math.min(1, nextRatio) * maxHalf;
  const end = x + width;
  const bend = x + width * 0.42;
  const control = x + width * 0.74;
  const color = FUNNEL_COLORS[Math.min(index, FUNNEL_COLORS.length - 1)];

  function path(padding: number) {
    return `M ${x},${center - leftHalf - padding} H ${bend} C ${control},${center - leftHalf - padding} ${control},${center - rightHalf - padding} ${end},${center - rightHalf - padding} V ${center + rightHalf + padding} C ${control},${center + rightHalf + padding} ${control},${center + leftHalf + padding} ${bend},${center + leftHalf + padding} H ${x} Z`;
  }

  return (
    <g>
      {[12, 6, 0].map((padding) => (
        <motion.path
          key={padding}
          initial={false}
          animate={{
            d: path(padding),
            opacity: padding === 0 ? (selected ? 1 : 0.85) : padding === 6 ? 0.24 : 0.14,
          }}
          transition={{ duration: reduce ? 0 : 0.35, ease: EASE_OUT }}
          fill={color}
        />
      ))}
      <rect
        x={x + width / 2 - 24}
        y={center - 13}
        width={48}
        height={26}
        rx={13}
        fill="var(--background)"
      />
      <text
        x={x + width / 2}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--foreground)"
        className="text-xs font-medium"
        pointerEvents="none"
      >
        {Math.round(ratio * 100)}%
      </text>
    </g>
  );
}

export function ConversionFunnel({
  periods,
  title = "工作分布",
  description,
  valueLabel = "当前条目",
  valueSuffix = "项",
  className,
}: ConversionFunnelProps) {
  const tabsId = useId();
  const [periodId, setPeriodId] = useState(periods[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const period = periods.find((item) => item.id === periodId) ?? periods[0];
  const stages = period?.stages ?? [];
  const first = stages[0]?.value ?? 0;
  const last = stages.at(-1)?.value ?? 0;
  const selected = stages.find((item) => item.id === selectedId) ?? stages.at(-1);
  const rate = first > 0 ? (last / first) * 100 : 0;
  const selectedIndex = stages.findIndex((item) => item.id === selected?.id);
  const previous = stages[selectedIndex - 1]?.value;
  const dropoff = previous && selected ? Math.max(0, ((previous - selected.value) / previous) * 100) : 0;

  return (
    <section
      aria-label={title}
      className={cn(
        "w-full min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-1 truncate text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {periods.length > 1 ? (
          <Tabs
            value={period?.id ?? ""}
            onValueChange={(value) => {
              setPeriodId(value);
              setSelectedId(null);
            }}
            variant="pill"
          >
            <TabsList aria-label={`${title} period`} className="gap-0 bg-muted p-1">
              {periods.map((item, index) => (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  indicatorClassName="bg-background"
                  className="h-7 px-3 py-0 text-xs focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : null}
      </header>

      <div className="my-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">{valueLabel}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {selected?.value ?? 0}<span className="ml-1 text-sm font-normal text-muted-foreground">{valueSuffix}</span>
          </p>
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowUpRight className="size-3.5" aria-hidden />
          {Math.round(rate)}% 首项保留
        </p>
      </div>

      <div role="tabpanel" id={`${tabsId}-chart`} className="h-44 w-full sm:h-48">
        {stages.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stages.map((item) => ({ ...item }))}
              barCategoryGap={2}
              margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
              accessibilityLayer
            >
              <XAxis dataKey="label" hide />
              <YAxis domain={[0, Math.max(1, first)]} hide />
              <Tooltip
                cursor={false}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-sm">
                      <p className="font-medium text-foreground">{payload[0].payload.label}</p>
                      <p className="mt-1 text-muted-foreground">{Number(payload[0].value).toLocaleString("zh-CN")} {valueSuffix}</p>
                    </div>
                  ) : null
                }
              />
              <Bar
                dataKey="value"
                isAnimationActive={false}
                shape={(props: BarShapeProps) => (
                  <FlowStage geometry={props} stages={stages} selected={selected?.id === stages[props.index]?.id} />
                )}
                onClick={(_, index) => setSelectedId(stages[index]?.id ?? null)}
                className="cursor-pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">暂无数据</div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {stages.map((item, index) => (
          <Button
            key={item.id}
            variant="ghost"
            size="small"
            aria-pressed={selected?.id === item.id}
            onClick={() => setSelectedId(item.id)}
            className={cn("h-7 gap-1.5 rounded-full px-2.5 text-xs", selected?.id === item.id && "bg-muted text-foreground")}
          >
            <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: FUNNEL_COLORS[Math.min(index, FUNNEL_COLORS.length - 1)] }} />
            {item.label}
          </Button>
        ))}
      </div>

      {selected ? (
        <motion.div
          key={`${period?.id}-${selected.id}`}
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3"
        >
          <p className="min-w-0 truncate text-xs font-medium text-foreground">
            {selected.label}<span className="ml-2 font-normal text-muted-foreground">{selected.detail}</span>
          </p>
          {selectedIndex > 0 ? (
            <p className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <ArrowDown className="size-3.5" aria-hidden />
              {dropoff.toFixed(1)}% 流失
            </p>
          ) : null}
        </motion.div>
      ) : null}
    </section>
  );
}
