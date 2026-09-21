"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardBody, CardHeader } from "@/components/premium/cards/card";

export type DonutDistributionItem = {
  id: string;
  label: string;
  value: number;
};

const chartColors = [
  "var(--be-chart-1)",
  "var(--be-chart-2)",
  "var(--be-chart-3)",
  "var(--be-chart-4)",
  "var(--be-chart-5)",
];

export function DonutDistribution({
  title,
  description,
  items,
  emptyText,
}: {
  title: string;
  description?: string;
  items: readonly DonutDistributionItem[];
  emptyText: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const data = items.filter((item) => item.value > 0);

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="py-3.5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>
      <CardBody className="p-4">
        {data.length ? (
          <div className="grid min-h-[220px] grid-cols-[minmax(180px,1fr)_minmax(132px,0.85fr)] items-center gap-4">
            <div className="h-[220px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="60%"
                    outerRadius="82%"
                    paddingAngle={2}
                    stroke="var(--card)"
                    strokeWidth={2}
                  >
                    {data.map((item, index) => (
                      <Cell key={item.id} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} 项`, name]}
                    contentStyle={{
                      borderRadius: "0.625rem",
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      boxShadow: "var(--shadow-sm)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none -mt-[138px] text-center">
                <p className="text-2xl font-semibold tabular-nums text-foreground">{total}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">工作项</p>
              </div>
            </div>
            <ul className="space-y-3">
              {data.map((item, index) => (
                <li key={item.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-slate-700">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: chartColors[index % chartColors.length] }}
                      aria-hidden
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                    {Math.round((item.value / total) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="grid min-h-[220px] place-items-center rounded-lg border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
