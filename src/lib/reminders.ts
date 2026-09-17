import {
  deadline,
  isWorkday,
  weekDates,
  type CalendarOverrides,
} from "./domain";
import { shanghaiDate } from "./daily-input";

export type ReminderMember = { id: string; name: string; createdAt: Date };
export type ReminderReport = {
  authorId: string;
  reportDate: string;
  status: string;
  submittedAt: Date | null;
  dueAt: Date;
};
export type Reminder = {
  recipientId: string;
  type: "DAILY_DUE" | "DAILY_OVERDUE" | "WEEKLY_DUE";
  date: string;
  title: string;
  dedupeKey: string;
};

/** Calculate actionable reminders without writing side effects. Callers persist using dedupeKey. */
export function dueReminders(input: {
  now: Date;
  members: ReminderMember[];
  reports: ReminderReport[];
  bosses: string[];
  overrides?: CalendarOverrides;
  exemptions?: Array<{ userId: string; startDate: string; endDate: string }>;
}) {
  const today = shanghaiDate(input.now);
  // The worker runs repeatedly; emit only today's reminder to avoid flooding users.
  const days = weekDates(today).filter((date) => date === today);
  const overrides = input.overrides ?? {};
  const exemptions = input.exemptions ?? [];
  const reports = new Map(
    input.reports.map((report) => [
      `${report.authorId}:${report.reportDate}`,
      report,
    ]),
  );
  const result: Reminder[] = [];
  for (const member of input.members) {
    for (const date of days) {
      if (
        date < shanghaiDate(member.createdAt) ||
        !isWorkday(date, overrides) ||
        exemptions.some(
          (item) =>
            item.userId === member.id &&
            item.startDate <= date &&
            item.endDate >= date,
        )
      )
        continue;
      const report = reports.get(`${member.id}:${date}`);
      const dueAt = report?.dueAt ?? deadline(date);
      if (report?.status === "SUBMITTED" || input.now < dueAt) continue;
      const overdue = input.now.getTime() > dueAt.getTime();
      result.push({
        recipientId: member.id,
        type: overdue ? "DAILY_OVERDUE" : "DAILY_DUE",
        date,
        title: overdue ? `${date} 日报已逾期` : `${date} 日报待提交`,
        dedupeKey: `daily-reminder:${member.id}:${date}:${overdue ? "overdue" : "due"}`,
      });
      if (overdue)
        for (const boss of input.bosses)
          result.push({
            recipientId: boss,
            type: "DAILY_OVERDUE",
            date,
            title: `${member.name} 的 ${date} 日报未提交`,
            dedupeKey: `daily-reminder:boss:${boss}:${member.id}:${date}`,
          });
    }
  }
  return result;
}
