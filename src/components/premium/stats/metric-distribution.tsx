import { ChevronRight } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/premium/cards/card";
import { Statistic } from "@/components/premium/stats/statistic-card";
import { cx } from "@/utils/cx";

export type MetricDistributionItem = {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  tone?: "neutral" | "info" | "success" | "danger";
};

export function MetricDistribution({
  title,
  description,
  items,
  emptyText,
}: {
  title: string;
  description?: string;
  items: readonly MetricDistributionItem[];
  emptyText: string;
}) {
  const maximum = Math.max(1, ...items.map((item) => item.value));

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="py-3.5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>
      <CardBody className="p-4">
        {items.length ? (
          <ul className="space-y-2.5">
            {items.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-2"
              >
                <ChevronRight
                  className="size-3.5 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-700">{item.label}</p>
                  <Statistic
                    label=""
                    value=""
                    progress={(item.value / maximum) * 100}
                    tone={item.tone}
                    className="[&>dt]:sr-only [&>dd]:sr-only [&>div]:mt-1"
                  />
                </div>
                <span
                  className={cx(
                    "text-xs font-semibold tabular-nums",
                    item.tone === "success"
                      ? "text-emerald-700"
                      : item.tone === "danger"
                        ? "text-rose-700"
                        : "text-slate-700",
                  )}
                >
                  {item.value}
                  {item.suffix ? ` ${item.suffix}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
