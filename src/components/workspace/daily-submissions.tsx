import { ButtonLink } from "@/components/base/buttons/button";
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
}: {
  data: SubmissionData;
  requestedPage: number;
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
  const pageCount = Math.max(1, Math.ceil(rows.length / 20));
  const page = Math.min(requestedPage, pageCount);
  return (
    <section
      id="today-submissions"
      className="rounded-3xl border border-border-button-default p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-title-2-medium">今日提交 · {date}</h2>
        <p className="text-body-regular text-text-secondary">
          未提交 {waiting} 人 · 已提交 {completed} 人 · 无需提交{" "}
          {rows.length - waiting - completed} 人
        </p>
      </div>
      {rows.length ? (
        <ul className="mt-4 divide-y divide-separator-border">
          {rows.slice((page - 1) * 20, page * 20).map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <span className="text-body-medium">{row.name}</span>
              <span className="text-body-regular text-text-secondary">
                {statusLabels[row.status]}
              </span>
              {row.report && (
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
