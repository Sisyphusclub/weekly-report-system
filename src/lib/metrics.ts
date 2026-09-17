import { and, count, desc, eq, gte, lte, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  blocker,
  report,
  workTask,
  user,
  reportingExemption,
  workCalendarDay,
} from "@/lib/db/schema";
import { weekDates, type Actor } from "@/lib/domain";
import { shanghaiDate } from "@/lib/daily-input";
import { weeklySubmissionMetrics } from "@/lib/submission-metrics";
import { blockerVisibility } from "@/lib/blockers";

export type DashboardMetrics = {
  submittedReports: number;
  dueReports: number;
  onTimeReports: number;
  openBlockers: number;
  urgentBlockers: number;
  inProgressTasks: number;
  completedTasks: number;
};

export function submissionRate(submitted: number, due: number) {
  return due === 0 ? null : Math.round((submitted / due) * 100);
}

export async function getDashboardMetrics(
  actor: Actor,
  now = new Date(),
): Promise<DashboardMetrics> {
  const organizationId = actor.organizationId;
  const dates = weekDates(shanghaiDate(now));
  const start = dates[0];
  const end = dates[6];
  const db = getDb();
  const [submitted, due, open, urgent, progress, done] = await Promise.all([
    db
      .select({
        authorId: report.authorId,
        reportDate: report.reportDate,
        submittedAt: report.submittedAt,
        dueAt: report.dueAt,
        status: report.status,
      })
      .from(report)
      .where(
        and(
          eq(report.organizationId, organizationId),
          eq(report.type, "DAILY"),
          gte(report.reportDate, start),
          lte(report.reportDate, end),
        ),
      ),
    db
      .select({ id: user.id, createdAt: user.createdAt })
      .from(user)
      .where(
        and(
          eq(user.organizationId, organizationId),
          eq(user.status, "ACTIVE"),
          ne(user.role, "ADMIN"),
        ),
      ),
    db
      .select({ value: count() })
      .from(blocker)
      .where(and(blockerVisibility(actor), ne(blocker.status, "RESOLVED"))),
    db
      .select({ value: count() })
      .from(blocker)
      .where(
        and(
          blockerVisibility(actor),
          ne(blocker.status, "RESOLVED"),
          eq(blocker.severity, "URGENT"),
        ),
      ),
    db
      .select({ value: count() })
      .from(workTask)
      .where(
        and(
          eq(workTask.organizationId, organizationId),
          eq(workTask.status, "IN_PROGRESS"),
          gte(workTask.workDate, start),
          lte(workTask.workDate, end),
        ),
      ),
    db
      .select({ value: count() })
      .from(workTask)
      .where(
        and(
          eq(workTask.organizationId, organizationId),
          eq(workTask.status, "DONE"),
          gte(workTask.workDate, start),
          lte(workTask.workDate, end),
        ),
      ),
  ]);
  const [calendar, exemptions] = await Promise.all([
    db
      .select()
      .from(workCalendarDay)
      .where(
        and(
          eq(workCalendarDay.organizationId, organizationId),
          gte(workCalendarDay.date, start),
          lte(workCalendarDay.date, end),
        ),
      )
      .orderBy(desc(workCalendarDay.version)),
    db
      .select({
        userId: reportingExemption.userId,
        startDate: reportingExemption.startDate,
        endDate: reportingExemption.endDate,
      })
      .from(reportingExemption)
      .where(
        and(
          eq(reportingExemption.organizationId, organizationId),
          lte(reportingExemption.startDate, end),
          gte(reportingExemption.endDate, start),
        ),
      ),
  ]);
  const overrides: Record<string, boolean> = {};
  for (const day of calendar)
    if (!(day.date in overrides)) overrides[day.date] = day.isWorkday;
  return {
    ...weeklySubmissionMetrics({
      now,
      members: due,
      reports: submitted,
      exemptions,
      overrides,
    }),
    openBlockers: open[0].value,
    urgentBlockers: urgent[0].value,
    inProgressTasks: progress[0].value,
    completedTasks: done[0].value,
  };
}
