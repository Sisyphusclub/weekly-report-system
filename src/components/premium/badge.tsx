"use client";

import type { ComponentProps } from "react";
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
  project: "neutral",
};

const toneClass: Partial<Record<BadgeTone, string>> = {
  purple: "border-status-purple-text/25 bg-status-purple-background text-status-purple-text",
  orange: "border-status-orange-text/25 bg-status-orange-background text-status-orange-text",
  project: "border-project-tag-border bg-project-tag-background text-project-tag-text",
};

export interface BadgeProps extends Omit<ComponentProps<typeof AnimatedBadge>, "status"> {
  color?: BadgeTone;
  tone?: BadgeTone;
  variant?: "caption" | "subtle" | "bold";
}

export function Badge({
  color,
  tone,
  variant: _variant,
  showIcon,
  className,
  ...props
}: BadgeProps) {
  const resolved = tone ?? color ?? "soft";
  const isStatus = ["lime", "yellow", "orange", "rose", "pink"].includes(resolved);
  return (
    <AnimatedBadge
      {...props}
      status={statusByTone[resolved]}
      size="sm"
      showIcon={showIcon ?? isStatus}
      className={cx(toneClass[resolved], className)}
    />
  );
}

export const Chip = Badge;
