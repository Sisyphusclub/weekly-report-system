import type { ComponentType } from "react";
import { ArrowRight } from "lucide-react";
import { Card, CardBody } from "@/components/premium/cards/card";
import { cx } from "@/utils/cx";

type StatisticTone = "neutral" | "info" | "success" | "danger";

export interface StatisticProps {
  label: string;
  value: number | string;
  suffix?: string;
  progress?: number;
  tone?: StatisticTone;
}

export function Statistic({
  label,
  value,
  suffix,
  progress,
  tone = "neutral",
}: StatisticProps) {
  return (
    <dl className="min-w-0 flex-1">
      <dt
        className={cx(
          "text-xs text-muted-foreground",
          tone === "danger" && "text-rose-700",
        )}
      >
        {label}
      </dt>
      <dd
        className={cx(
          "mt-1 text-2xl font-bold tabular-nums text-foreground",
          tone === "danger" && "text-rose-700",
        )}
      >
        {value}
        {suffix ? (
          <small className="ml-1 text-sm font-medium">{suffix}</small>
        ) : null}
      </dd>
      {progress !== undefined ? (
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, Math.max(0, progress))}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      ) : null}
    </dl>
  );
}

export interface StatisticCardProps extends StatisticProps {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  href?: string;
  className?: string;
}

export function StatisticCard({
  icon: Icon,
  href,
  className,
  tone = "neutral",
  ...statisticProps
}: StatisticCardProps) {
  const card = (
    <Card
      className={cx(
        "h-full min-h-24",
        tone === "danger" && "border-rose-200 bg-rose-50/70 text-rose-700",
        className,
      )}
    >
      <CardBody className="flex h-full items-center gap-4">
        <span
          className={cx(
            "grid size-10 shrink-0 place-items-center rounded-lg border border-transparent bg-muted text-muted-foreground",
            tone === "info" && "border-blue-200 bg-blue-50 text-blue-700",
            tone === "success" &&
              "border-emerald-200 bg-emerald-50 text-emerald-700",
            tone === "danger" &&
              "border-rose-700 bg-rose-700 text-white shadow-sm",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <Statistic tone={tone} {...statisticProps} />
        {href ? <ArrowRight className="size-4 shrink-0" aria-hidden /> : null}
      </CardBody>
    </Card>
  );

  return href ? (
    <a
      href={href}
      className="block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {card}
    </a>
  ) : (
    card
  );
}
