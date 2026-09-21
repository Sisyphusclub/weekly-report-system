import { RiArrowRightLine } from "@remixicon/react";
import { ButtonLink } from "@/components/motion/button/base";
import { Badge } from "@/components/premium/badge";

export function BlockerStream({
  items,
}: {
  items: Array<{
    id: string;
    projectName?: string;
    reporter: string;
    severity: "NORMAL" | "IMPORTANT" | "URGENT";
    description: string;
    age: string;
  }>;
}) {
  const severityLabel = {
    NORMAL: "一般",
    IMPORTANT: "重要",
    URGENT: "紧急",
  } as const;
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-xl border border-rose-200 bg-rose-50 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant="caption"
              color={
                item.severity === "URGENT"
                  ? "danger"
                  : item.severity === "IMPORTANT"
                    ? "warning"
                    : "neutral"
              }
            >
              {severityLabel[item.severity]}
            </Badge>
            <span className="text-[11px] font-normal leading-4 text-rose-700">
              {item.age}
            </span>
          </div>
          <p className="mt-3 line-clamp-2 text-sm font-medium leading-5 text-rose-700">
            {item.description}
          </p>
          <div className="mt-2 flex min-w-0 items-center gap-2 text-xs font-normal leading-4 text-rose-700">
            <Badge color="neutral" variant="caption" showIcon={false}>
              {item.projectName ?? "未关联项目"}
            </Badge>
            <span className="truncate">{item.reporter}</span>
          </div>
          <div className="mt-4 flex items-center justify-end">
            <ButtonLink
              size="small"
              variant="ghost"
              href={`/blockers/${item.id}`}
            >
              详情 <RiArrowRightLine className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        </article>
      ))}
      {items.length === 0 && (
        <div className="lg:col-span-3 rounded-xl border border-dashed border-slate-200/80 px-4 py-8 text-center text-sm font-normal leading-5 text-slate-500">
          当前没有待协调阻塞
        </div>
      )}
    </div>
  );
}
