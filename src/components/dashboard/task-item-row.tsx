import { Badge } from "@/components/premium/badge";
import { cx } from "@/utils/cx";

export type WorkStatus =
  "DONE" | "IN_PROGRESS" | "BLOCKED" | "TODO" | "CANCELED";

const statusLabel: Record<WorkStatus, string> = {
  DONE: "已完成",
  IN_PROGRESS: "推进中",
  BLOCKED: "阻塞",
  TODO: "待开始",
  CANCELED: "已取消",
};
const statusColor: Record<
  WorkStatus,
  "lime" | "blue" | "rose" | "yellow" | "neutral"
> = {
  DONE: "lime",
  IN_PROGRESS: "blue",
  BLOCKED: "rose",
  TODO: "yellow",
  CANCELED: "neutral",
};

export function TaskItemRow({
  index,
  content,
  projectName,
  category,
  deliverableText,
  status,
  isPlan = false,
}: {
  index: number;
  content: string;
  projectName?: string;
  category: string;
  deliverableText?: string;
  status: WorkStatus;
  isPlan?: boolean;
}) {
  return (
    <li
      className={cx(
        "grid min-w-0 grid-cols-[20px_minmax(0,1fr)_auto] gap-x-2 gap-y-1 py-2.5",
        isPlan && "rounded-lg bg-background-secondary-default px-2",
      )}
    >
      <span className="pt-0.5 text-caption-1-semibold tabular-nums text-accent-600">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0 break-words text-body-regular leading-5 text-text-primary">
        {projectName && (
          <Badge
            color="project"
            variant="caption"
            showIcon={false}
            className="mr-1.5 align-middle"
          >
            {projectName}
          </Badge>
        )}
        {content}
      </div>
      <Badge variant="caption" color={isPlan ? "yellow" : "soft"}>
        {category}
      </Badge>
      <div className="col-[2/-1] flex min-w-0 items-center gap-2 pl-0">
        {deliverableText && (
          <span className="min-w-0 flex-1 truncate rounded bg-status-blue-background px-2 py-1 text-caption-2-medium text-status-blue-text">
            产出：{deliverableText}
          </span>
        )}
        <Badge variant="caption" color={statusColor[status]} className="ml-auto">
          {statusLabel[status]}
        </Badge>
      </div>
    </li>
  );
}

