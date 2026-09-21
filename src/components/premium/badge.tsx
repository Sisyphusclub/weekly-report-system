"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  AnimatedBadge,
  type AnimatedBadgeStatus,
} from "@/components/motion/animated-badge";
import { cx } from "@/utils/cx";

export type BadgeTone =
  "neutral" | "info" | "success" | "warning" | "danger" | "processing";

const statusByTone: Record<BadgeTone, AnimatedBadgeStatus> = {
  neutral: "neutral",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
  processing: "info",
};

const toneClass: Record<BadgeTone, string> = {
  neutral: "border-border bg-muted text-foreground",
  info: "border-info-border bg-info-subtle text-info",
  success: "border-success-border bg-success-subtle text-success",
  warning: "border-warning-border bg-warning-subtle text-warning",
  danger: "border-danger-border bg-danger-subtle text-destructive",
  processing: "border-info-border bg-info-subtle text-info",
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
  const resolved = tone ?? color ?? "neutral";
  const isStatus = ["success", "warning", "danger"].includes(resolved);
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
