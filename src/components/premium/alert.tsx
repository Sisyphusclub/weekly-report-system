import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/utils/cx";

type AlertType = "info" | "success" | "warning" | "error";

const typeClass: Record<AlertType, string> = {
  info: "border-primary/25 bg-primary/5 text-primary",
  success:
    "border-emerald-200 bg-emerald-50/70 text-emerald-700",
  warning: "border-amber-200 bg-amber-50/70 text-amber-700",
  error: "border-rose-200 bg-rose-50/70 text-rose-700",
};

const iconByType = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
} as const;

const iconClass: Record<AlertType, string> = {
  info: "bg-primary text-primary-foreground",
  success: "bg-emerald-700 text-white",
  warning: "bg-amber-700 text-white",
  error: "bg-rose-700 text-white",
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
