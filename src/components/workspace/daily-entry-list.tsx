import { Badge, type BadgeTone } from "@/components/premium/badge";
import { List } from "@/components/premium/list";
import type { DailyEntry } from "@/lib/daily-input";

type Entry = Pick<
  DailyEntry,
  "content" | "status" | "category" | "deliverables"
> & { projectName?: string };

const status: Record<DailyEntry["status"], { label: string; tone: BadgeTone }> =
  {
    TODO: { label: "待开始", tone: "neutral" },
    IN_PROGRESS: { label: "进行中", tone: "info" },
    BLOCKED: { label: "阻塞", tone: "danger" },
    DONE: { label: "已完成", tone: "success" },
    CANCELED: { label: "已取消", tone: "neutral" },
  };

export function DailyEntryList({
  entries,
  emptyText,
}: {
  entries: readonly Entry[];
  emptyText: string;
}) {
  if (!entries.length) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <List
      dataSource={entries}
      rowKey={(entry, index) => String(index) + ":" + entry.content}
      itemClassName="bg-background/60 px-4 py-3.5"
      renderItem={(entry, index) => (
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-xs font-medium tabular-nums text-muted-foreground"
              aria-hidden="true"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-foreground">
              {entry.content}
            </p>
          </div>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pl-10 text-xs text-muted-foreground">
            <Badge tone={status[entry.status].tone} showIcon={false}>
              {status[entry.status].label}
            </Badge>
            <span className="break-words">{entry.category}</span>
            {entry.projectName ? (
              <span className="break-words">· {entry.projectName}</span>
            ) : null}
          </div>
          {entry.deliverables.length > 0 && (
            <p className="mt-2 min-w-0 whitespace-pre-wrap break-words pl-10 text-xs leading-5 text-muted-foreground">
              产出 · {entry.deliverables.join(" · ")}
            </p>
          )}
        </div>
      )}
    />
  );
}
