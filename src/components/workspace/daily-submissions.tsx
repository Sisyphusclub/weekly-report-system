import { ButtonLink } from "@/components/motion/button/base";
import { Badge } from "@/components/premium/badge";
import {
  dailySubmissionStatus,
  type DailySubmissionStatus,
} from "@/lib/submission-metrics";
import type { SubmissionData } from "@/lib/submission-data";
import { shanghaiDate } from "@/lib/daily-input";

const statusLabels: Record<DailySubmissionStatus, string> = {
  SUBMITTED: "已提交",
  LATE: "已补交",
  PENDING: "未提交",
  OVERDUE: "已逾期",
  EXEMPT: "今日免报",
  REST_DAY: "休息日",
  NOT_STARTED: "尚未入职",
};
const statusColors: Record<
  DailySubmissionStatus,
  | "orange"
  | "lime"
  | "rose"
  | "yellow"
  | "cyan"
  | "blue"
  | "purple"
  | "neutral"
> = {
  SUBMITTED: "lime",
  LATE: "yellow",
  PENDING: "orange",
  OVERDUE: "rose",
  EXEMPT: "blue",
  REST_DAY: "neutral",
  NOT_STARTED: "purple",
};
const statusOrder: Record<DailySubmissionStatus, number> = {
  OVERDUE: 0,
  PENDING: 1,
  LATE: 2,
  SUBMITTED: 3,
  EXEMPT: 4,
  REST_DAY: 5,
  NOT_STARTED: 6,
};

export function DailySubmissions({
  data,
  requestedPage,
  showReportLinks = true,
}: {
  data: SubmissionData;
  requestedPage: number;
  showReportLinks?: boolean;
}) {
  const date = shanghaiDate(data.now);
  const rows = data.members
    .map((member) => ({
      ...member,
      status: dailySubmissionStatus(data, member),
      report: data.reports.find(
        (report) =>
          report.authorId === member.id &&
          report.reportDate === date &&
          report.status === "SUBMITTED" &&
          report.submittedAt &&
          report.submittedAt <= data.now,
      ),
    }))
    .sort(
      (a, b) =>
        statusOrder[a.status] - statusOrder[b.status] ||
        a.name.localeCompare(b.name, "zh-CN") ||
        a.id.localeCompare(b.id),
    );
  const waiting = rows.filter(
    (row) => row.status === "PENDING" || row.status === "OVERDUE",
  ).length;
  const completed = rows.filter(
    (row) => row.status === "SUBMITTED" || row.status === "LATE",
  ).length;
  const due = rows.length -
    rows.filter(
      (row) =>
        row.status === "EXEMPT" ||
        row.status === "REST_DAY" ||
        row.status === "NOT_STARTED",
    ).length;
  const followUp = waiting;
  const displayDate = date.replaceAll("-", ".");
  const pageCount = Math.max(1, Math.ceil(rows.length / 20));
  const page = Math.min(requestedPage, pageCount);
  return (
    <section
      id="today-submissions"
      className="rounded-3xl border border-border-button-default bg-background-primary-default p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-caption-1-medium text-text-tertiary">日报看板</p>
          <h2 className="mt-1 text-title-2-medium">今日提交 · {displayDate}</h2>
        </div>
        <p className="text-body-regular text-text-secondary">
          按当前有效成员统计
        </p>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["应提交", due, "soft"],
          ["已提交", completed, "lime"],
          ["待跟进", followUp, "rose"],
          ["无需提交", rows.length - due, "blue"],
        ].map(([label, value, color]) => (
          <div
            key={label}
            className="rounded-2xl border border-border-button-default bg-background-primary-default p-4"
          >
            <p className="text-caption-1-medium text-text-secondary">{label}</p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="text-title-2-medium">{value}</p>
              <Badge
                variant="caption"
                color={color as "soft" | "lime" | "rose" | "blue"}
              >
                人
              </Badge>
            </div>
          </div>
        ))}
      </div>
      {rows.length ? (
        <ul className="mt-4 divide-y divide-separator-border">
          {rows.slice((page - 1) * 20, page * 20).map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <span className="text-body-medium">{row.name}</span>
              <Badge
                variant="caption"
                color={statusColors[row.status]}
              >
                {statusLabels[row.status]}
              </Badge>
              {showReportLinks && row.report && (
                <ButtonLink href={`/reports/${row.report.id}`} variant="ghost">
                  查看日报
                </ButtonLink>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-body-regular text-text-secondary">
          暂无需要填报的成员
        </p>
      )}
      {pageCount > 1 && (
        <nav
          aria-label="今日提交分页"
          className="mt-4 flex flex-wrap items-center gap-3"
        >
          {page > 1 && (
            <ButtonLink
              href={`/dashboard?submissionPage=${page - 1}#today-submissions`}
              variant="secondary"
            >
              上一页
            </ButtonLink>
          )}
          <span className="text-body-regular">
            第 {page} / {pageCount} 页
          </span>
          {page < pageCount && (
            <ButtonLink
              href={`/dashboard?submissionPage=${page + 1}#today-submissions`}
              variant="secondary"
            >
              下一页
            </ButtonLink>
          )}
        </nav>
      )}
    </section>
  );
}

