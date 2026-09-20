import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const sizes = { xs: "size-5 text-[10px]", sm: "size-6 text-xs", md: "size-8 text-sm", lg: "size-9 text-base" };

export function Avatar({
  initials,
  src,
  alt = "",
  size = "md",
  className,
  ...props
}: ComponentProps<"span"> & { initials?: string; src?: string; alt?: string; size?: keyof typeof sizes; color?: string }) {
  return (
    <span {...props} className={cn("inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary", sizes[size], className)}>
      {src ? <img src={src} alt={alt} className="size-full object-cover" /> : initials}
    </span>
  );
}
