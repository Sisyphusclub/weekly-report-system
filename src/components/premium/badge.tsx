"use client";

import type { ComponentProps, ReactNode } from "react";
import { AnimatedBadge, type AnimatedBadgeStatus } from "@/components/motion/animated-badge";
import { cx } from "@/utils/cx";

export type BadgeTone =
  | "soft"
  | "neutral"
  | "blue"
  | "purple"
  | "lime"
  | "yellow"
  | "orange"
  | "rose"
  | "pink"
  | "gray"
  | "cyan"
  | "processing"
  | "project";

const statusByTone: Record<BadgeTone, AnimatedBadgeStatus> = {
  soft: "neutral",
  neutral: "neutral",
  blue: "info",
  purple: "info",
  lime: "success",
  yellow: "warning",
  orange: "warning",
  rose: "danger",
  pink: "danger",
  gray: "neutral",
  cyan: "info",
  processing: "info",
  project: "neutral",
};

const toneClass: Partial<Record<BadgeTone, string>> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  blue: "border-status-blue-text/25 bg-status-blue-background text-status-blue-text",
  purple: "border-status-purple-text/25 bg-status-purple-background text-status-purple-text",
  orange: "border-status-orange-text/25 bg-status-orange-background text-status-orange-text",
  project: "border-project-tag-border bg-project-tag-background text-project-tag-text",
  processing: "border-blue-200 bg-blue-50 text-blue-700",
};

export interface BadgeProps extends Omit<
  ComponentProps<typeof AnimatedBadge>,
  "status" | "children"
> {
  color?: BadgeTone;
  tone?: BadgeTone;
  variant?: "caption" | "subtle" | "bold";
  status?: AnimatedBadgeStatus;
  text?: ReactNode;
  children?: ReactNode;
}

export function Badge({
  color,
  tone,
  variant: _variant,
  status,
  text,
  children,
  showIcon,
  className,
  ...props
}: BadgeProps) {
  const resolved = tone ?? color ?? "soft";
  const isStatus = ["lime", "yellow", "orange", "rose", "pink"].includes(resolved);
  return (
    <AnimatedBadge
      {...props}
      status={status ?? statusByTone[resolved]}
      size="sm"
      showIcon={showIcon ?? (Boolean(status) || isStatus)}
      className={cx(toneClass[resolved], className)}
    >
      {text ?? children}
    </AnimatedBadge>
  );
}

export const Chip = Badge;

export interface TagProps extends Omit<BadgeProps, "status" | "text"> {}

export function Tag({ showIcon = false, ...props }: TagProps) {
  return <Badge {...props} showIcon={showIcon} />;
}
