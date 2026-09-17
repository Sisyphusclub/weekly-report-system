import { and, count, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { blocker, report, workTask } from "@/lib/db/schema";
import { weekDates } from "@/lib/domain";

export type DashboardMetrics = {
  submittedReports: number;
  dueReports: number;
  openBlockers: number;
  urgentBlockers: number;
  inProgressTasks: number;
  completedTasks: number;
};

export function submissionRate(submitted: number, due: number) {
  return due === 0 ? null : Math.round((submitted / due) * 100);
}

export async function getDashboardMetrics(
  organizationId: string,
  date = new Date().toISOString().slice(0, 10),
): Promise<DashboardMetrics> {
  const [start, , , , end] = weekDates(date);
  const db = getDb();
  const [submitted, due, open, urgent, progress, done] = await Promise.all([
    db
      .select({ value: count() })
      .from(report)
      .where(
        and(
          eq(report.organizationId, organizationId),
          eq(report.type, "DAILY"),
          eq(report.status, "SUBMITTED"),
          gte(report.reportDate, start),
          lte(report.reportDate, end),
        ),
      ),
    db
      .select({ value: count() })
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
      .select({ value: count() })
      .from(blocker)
      .where(
        and(
          eq(blocker.organizationId, organizationId),
          eq(blocker.status, "OPEN"),
        ),
      ),
    db
      .select({ value: count() })
      .from(blocker)
      .where(
        and(
          eq(blocker.organizationId, organizationId),
          eq(blocker.status, "OPEN"),
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
  return {
    submittedReports: submitted[0].value,
    dueReports: due[0].value,
    openBlockers: open[0].value,
    urgentBlockers: urgent[0].value,
    inProgressTasks: progress[0].value,
    completedTasks: done[0].value,
  };
}
