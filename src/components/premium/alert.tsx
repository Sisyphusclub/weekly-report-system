import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/utils/cx";

type AlertType = "info" | "success" | "warning" | "error";

const typeClass: Record<AlertType, string> = {
  info: "border-primary/25 bg-primary/5 text-primary",
  success: "border-success-border bg-success-subtle text-success",
  warning: "border-warning-border bg-warning-subtle text-warning",
  error: "border-danger-border bg-danger-subtle text-destructive",
};

const iconByType = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
} as const;

const iconClass: Record<AlertType, string> = {
  info: "bg-primary text-primary-foreground",
  success: "bg-success text-card",
  warning: "bg-warning text-card",
  error: "bg-destructive text-destructive-foreground",
};

export interface AlertProps extends Omit<ComponentProps<"aside">, "title"> {
  type?: AlertType;
  showIcon?: boolean;
  message: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export function Alert({
  type = "info",
  showIcon = false,
  message,
  description,
  action,
  className,
  ...props
}: AlertProps) {
  const Icon = iconByType[type];

  return (
    <aside
      role={type === "error" ? "alert" : "status"}
      data-slot="alert"
      className={cx(
        "flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5",
        typeClass[type],
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {showIcon ? (
          <span
            className={cx(
              "grid size-6 shrink-0 place-items-center rounded-md shadow-sm",
              iconClass[type],
            )}
          >
            <Icon className="size-3.5" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-semibold">{message}</p>
          {description ? (
            <p className="mt-0.5 text-xs opacity-80">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </aside>
  );
}
