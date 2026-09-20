"use client";

import type { ComponentProps, ReactNode } from "react";
import { AnimatedBadge, type AnimatedBadgeStatus } from "@/components/motion/animated-badge";
import { cx } from "@/utils/cx";

export type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "processing";

const statusByTone: Record<BadgeTone, AnimatedBadgeStatus> = {
  neutral: "neutral",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
  processing: "info",
};

const toneClass: Record<BadgeTone, string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
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
