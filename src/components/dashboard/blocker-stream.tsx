import { RiArrowRightLine, RiUserAddLine } from "@remixicon/react";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Chip } from "@/components/base/badges/chip";

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
          className="rounded-xl border border-status-rose-text/30 bg-status-rose-background p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <Chip
              variant="caption"
              color={
                item.severity === "URGENT"
                  ? "rose"
                  : item.severity === "IMPORTANT"
                    ? "yellow"
                    : "soft"
              }
            >
              {severityLabel[item.severity]}
            </Chip>
            <span className="text-caption-2-regular text-status-rose-text">
              {item.age}
            </span>
          </div>
          <p className="mt-3 line-clamp-2 text-body-medium text-status-rose-text">
            {item.description}
          </p>
          <p className="mt-2 text-caption-1-regular text-status-rose-text">
            {item.projectName ?? "未关联项目"} · {item.reporter}
          </p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button
              size="small"
              variant="secondary"
              leadingIcon={RiUserAddLine}
            >
              指派协调人
            </Button>
            <ButtonLink
              size="small"
              variant="ghost"
              href={`/blockers/${item.id}`}
              trailingIcon={RiArrowRightLine}
            >
              详情
            </ButtonLink>
          </div>
        </article>
      ))}
      {items.length === 0 && (
        <div className="lg:col-span-3 rounded-xl border border-dashed border-border-button-default px-4 py-8 text-center text-body-regular text-text-tertiary">
          当前没有待协调阻塞
        </div>
      )}
    </div>
  );
}
