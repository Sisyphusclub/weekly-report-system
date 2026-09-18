import { and, asc, desc, eq, gte, lte, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  report,
  reportingExemption,
  user,
  workCalendarDay,
} from "@/lib/db/schema";
import { weekDates, type Actor } from "@/lib/domain";
import { shanghaiDate } from "@/lib/daily-input";

// Deliberately selects submission metadata only, never draft content or leave reasons.
export async function getSubmissionData(actor: Actor, now: Date) {
  const dates = weekDates(shanghaiDate(now));
  const db = getDb();
  const [members, reports, exemptions, calendar] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, createdAt: user.createdAt })
      .from(user)
      .where(
        and(
          eq(user.organizationId, actor.organizationId),
          eq(user.status, "ACTIVE"),
          ne(user.role, "ADMIN"),
        ),
      )
      .orderBy(asc(user.name), asc(user.id)),
    db
      .select({
        id: report.id,
        authorId: report.authorId,
        reportDate: report.reportDate,
        status: report.status,
        dueAt: report.dueAt,
        submittedAt: report.submittedAt,
      })
      .from(report)
      .where(
        and(
          eq(report.organizationId, actor.organizationId),
          eq(report.type, "DAILY"),
          gte(report.reportDate, dates[0]),
          lte(report.reportDate, dates[6]),
        ),
      ),
    db
      .select({
        userId: reportingExemption.userId,
        startDate: reportingExemption.startDate,
        endDate: reportingExemption.endDate,
      })
      .from(reportingExemption)
      .where(
        and(
          eq(reportingExemption.organizationId, actor.organizationId),
          lte(reportingExemption.startDate, dates[6]),
          gte(reportingExemption.endDate, dates[0]),
        ),
      ),
    db
      .select({
        date: workCalendarDay.date,
        isWorkday: workCalendarDay.isWorkday,
        version: workCalendarDay.version,
      })
      .from(workCalendarDay)
      .where(
        and(
          eq(workCalendarDay.organizationId, actor.organizationId),
          gte(workCalendarDay.date, dates[0]),
          lte(workCalendarDay.date, dates[6]),
        ),
      )
      .orderBy(desc(workCalendarDay.version)),
  ]);
  const overrides: Record<string, boolean> = {};
  for (const day of calendar)
    if (!(day.date in overrides)) overrides[day.date] = day.isWorkday;
  return { now, members, reports, exemptions, overrides };
}

export type SubmissionData = Awaited<ReturnType<typeof getSubmissionData>>;
