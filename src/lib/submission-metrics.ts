import {
  deadline,
  isWorkday,
  weekDates,
  type CalendarOverrides,
} from "@/lib/domain";
import { shanghaiDate } from "@/lib/daily-input";

// Scope is current active reporting members, through elapsed deadlines this week.
export function weeklySubmissionMetrics(input: {
  now: Date;
  members: Array<{ id: string; createdAt: Date }>;
  reports: Array<{
    authorId: string;
    reportDate: string | null;
    submittedAt: Date | null;
    dueAt: Date;
    status: string;
  }>;
  exemptions: Array<{ userId: string; startDate: string; endDate: string }>;
  overrides: CalendarOverrides;
}) {
  let dueReports = 0;
  let submittedReports = 0;
  let onTimeReports = 0;
  const days = weekDates(shanghaiDate(input.now));
  const reports = new Map(
    input.reports.map((item) => [`${item.authorId}:${item.reportDate}`, item]),
  );
  for (const member of input.members) {
    for (const date of days) {
      if (
        date < shanghaiDate(member.createdAt) ||
        !isWorkday(date, input.overrides)
      )
        continue;
      if (
        input.exemptions.some(
          (item) =>
            item.userId === member.id &&
            item.startDate <= date &&
            item.endDate >= date,
        )
      )
        continue;
      const report = reports.get(`${member.id}:${date}`);
      const dueAt = report?.dueAt ?? deadline(date);
      if (dueAt > input.now) continue;
      dueReports++;
      if (
        report?.status === "SUBMITTED" &&
        report.submittedAt &&
        report.submittedAt <= input.now
      ) {
        submittedReports++;
        if (report.submittedAt <= dueAt) onTimeReports++;
      }
    }
  }
  return { dueReports, submittedReports, onTimeReports };
}
