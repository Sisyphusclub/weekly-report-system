import type { ComponentProps } from "react";
import { cx } from "@/utils/cx";

export function FooterToolbar({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="footer-toolbar"
      className={cx(
        "sticky bottom-0 z-20 -mx-4 flex flex-col gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-[0_-8px_24px_-20px_rgba(15,23,42,0.45)] backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-t-xl sm:border-x",
        className,
      )}
      {...props}
    />
  );
}
