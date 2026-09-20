import type { ComponentProps } from "react";
import { cx } from "@/utils/cx";

type GridSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
type Gap = "none" | "xs" | "sm" | "md" | "lg";

const spanClass: Record<GridSpan, string> = {
  1: "col-span-1", 2: "col-span-2", 3: "col-span-3", 4: "col-span-4",
  5: "col-span-5", 6: "col-span-6", 7: "col-span-7", 8: "col-span-8",
  9: "col-span-9", 10: "col-span-10", 11: "col-span-11", 12: "col-span-12",
};

const mdSpanClass: Record<GridSpan, string> = {
  1: "md:col-span-1", 2: "md:col-span-2", 3: "md:col-span-3", 4: "md:col-span-4",
  5: "md:col-span-5", 6: "md:col-span-6", 7: "md:col-span-7", 8: "md:col-span-8",
  9: "md:col-span-9", 10: "md:col-span-10", 11: "md:col-span-11", 12: "md:col-span-12",
};

const lgSpanClass: Record<GridSpan, string> = {
  1: "lg:col-span-1", 2: "lg:col-span-2", 3: "lg:col-span-3", 4: "lg:col-span-4",
  5: "lg:col-span-5", 6: "lg:col-span-6", 7: "lg:col-span-7", 8: "lg:col-span-8",
  9: "lg:col-span-9", 10: "lg:col-span-10", 11: "lg:col-span-11", 12: "lg:col-span-12",
};

const xlSpanClass: Record<GridSpan, string> = {
  1: "xl:col-span-1", 2: "xl:col-span-2", 3: "xl:col-span-3", 4: "xl:col-span-4",
  5: "xl:col-span-5", 6: "xl:col-span-6", 7: "xl:col-span-7", 8: "xl:col-span-8",
  9: "xl:col-span-9", 10: "xl:col-span-10", 11: "xl:col-span-11", 12: "xl:col-span-12",
};

const gapClass: Record<Gap, string> = {
  none: "gap-0",
  xs: "gap-1.5",
  sm: "gap-2.5",
  md: "gap-4",
  lg: "gap-6",
};

export interface RowProps extends ComponentProps<"div"> {
  gap?: Gap;
}

export function Row({ gap = "none", className, ...props }: RowProps) {
  return (
    <div
      data-slot="row"
      className={cx("grid grid-cols-12", gapClass[gap], className)}
      {...props}
    />
  );
}

export interface ColProps extends ComponentProps<"div"> {
  span?: GridSpan;
  md?: GridSpan;
  lg?: GridSpan;
  xl?: GridSpan;
}

export function Col({
  span = 12,
  md,
  lg,
  xl,
  className,
  ...props
}: ColProps) {
  return (
    <div
      data-slot="col"
      className={cx(
        "min-w-0",
        spanClass[span],
        md && mdSpanClass[md],
        lg && lgSpanClass[lg],
        xl && xlSpanClass[xl],
        className,
      )}
      {...props}
    />
  );
}

export interface InlineProps extends ComponentProps<"div"> {
  gap?: Gap;
  align?: "start" | "center" | "end";
  justify?: "start" | "center" | "between" | "end";
  wrap?: boolean;
}

const alignClass = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
} as const;

const justifyClass = {
  start: "justify-start",
  center: "justify-center",
  between: "justify-between",
  end: "justify-end",
} as const;

export function Inline({
  gap = "sm",
  align = "center",
  justify = "start",
  wrap = false,
  className,
  ...props
}: InlineProps) {
  return (
    <div
      data-slot="inline"
      className={cx(
        "flex min-w-0",
        gapClass[gap],
        alignClass[align],
        justifyClass[justify],
        wrap && "flex-wrap",
        className,
      )}
      {...props}
    />
  );
}
