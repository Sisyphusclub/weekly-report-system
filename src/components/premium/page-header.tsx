import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/utils/cx";

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cx(
        "flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs font-medium text-primary">
            {eyebrow}
            {meta}
          </div>
        ) : null}
        <h1 className="text-2xl font-semibold leading-8 tracking-[-0.01em] text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function Panel({
  children,
  className,
  ...props
}: ComponentProps<"section">) {
  return (
    <section
      data-slot="panel"
      className={cx(
        "rounded-xl border border-border bg-card text-card-foreground shadow-xs",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
