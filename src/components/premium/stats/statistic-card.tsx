import type { ComponentType, ReactNode } from "react";
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
  className?: string;
}

export function Statistic({
  label,
  value,
  suffix,
  progress,
  tone = "neutral",
  className,
}: StatisticProps) {
  return (
    <dl className={cx("min-w-0 flex-1", className)}>
      <dt
        className={cx(
          "text-xs text-muted-foreground",
          tone === "danger" && "text-destructive",
        )}
      >
        {label}
      </dt>
      <dd
        className={cx(
          "mt-1 text-2xl font-bold tabular-nums text-foreground",
          tone === "danger" && "text-destructive",
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
  trailing?: ReactNode;
  className?: string;
}

export function StatisticCard({
  icon: Icon,
  href,
  trailing,
  className,
  tone = "neutral",
  ...statisticProps
}: StatisticCardProps) {
  const card = (
    <Card
      className={cx(
        "h-full min-h-24",
        tone === "danger" &&
          "border-danger-border bg-danger-subtle text-destructive",
        className,
      )}
    >
      <CardBody className="flex h-full items-center gap-4">
        <span
          className={cx(
            "grid size-10 shrink-0 place-items-center rounded-lg border border-transparent bg-muted text-muted-foreground",
            tone === "info" && "border-info-border bg-info-subtle text-info",
            tone === "success" &&
              "border-success-border bg-success-subtle text-success",
            tone === "danger" &&
              "border-destructive bg-destructive text-destructive-foreground shadow-sm",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <Statistic tone={tone} {...statisticProps} />
        {trailing}
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
