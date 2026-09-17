import { and, eq, gte, lte, ne } from "drizzle-orm";
import { getDb } from "../src/lib/db/index.js";
import {
  notification,
  blocker,
  report,
  reportingExemption,
  user,
  workCalendarDay,
} from "../src/lib/db/schema.js";
import { dueReminders, weeklyReminders } from "../src/lib/reminders.js";
import { shanghaiDate } from "../src/lib/daily-input.js";
import { weekDates } from "../src/lib/domain.js";
import { deadline, weeklyPeriod } from "../src/lib/domain.js";
import { overdueBlockerReminders } from "../src/lib/blocker-reminders.js";

async function main() {
  const now = new Date();
  const db = getDb();
  const organizationId = process.env.REMINDER_ORGANIZATION_ID;
  if (!organizationId) throw new Error("REMINDER_ORGANIZATION_ID is required");
  const dates = weekDates(shanghaiDate(now));
  const [members, bosses, reports, blockers, calendar, exemptions] =
    await Promise.all([
      db
        .select({ id: user.id, name: user.name, createdAt: user.createdAt })
        .from(user)
        .where(
          and(
            eq(user.organizationId, organizationId),
            eq(user.status, "ACTIVE"),
            ne(user.role, "ADMIN"),
          ),
        ),
      db
        .select({ id: user.id })
        .from(user)
        .where(
          and(
            eq(user.organizationId, organizationId),
            eq(user.status, "ACTIVE"),
            eq(user.role, "BOSS"),
          ),
        ),
      db
        .select({
          authorId: report.authorId,
          reportDate: report.reportDate,
          status: report.status,
          submittedAt: report.submittedAt,
          dueAt: report.dueAt,
        })
        .from(report)
        .where(
          and(
            eq(report.organizationId, organizationId),
            eq(report.type, "DAILY"),
            gte(report.reportDate, dates[0]),
            lte(report.reportDate, dates[6]),
          ),
        ),
      db
        .select({
          id: blocker.id,
          severity: blocker.severity,
          status: blocker.status,
          createdAt: blocker.createdAt,
          coordinatorId: blocker.coordinatorId,
        })
        .from(blocker)
        .where(eq(blocker.organizationId, organizationId)),
      db
        .select({
          date: workCalendarDay.date,
          isWorkday: workCalendarDay.isWorkday,
        })
        .from(workCalendarDay)
        .where(
          and(
            eq(workCalendarDay.organizationId, organizationId),
            gte(workCalendarDay.date, dates[0]),
            lte(workCalendarDay.date, dates[6]),
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
            eq(reportingExemption.organizationId, organizationId),
            lte(reportingExemption.startDate, dates[6]),
            gte(reportingExemption.endDate, dates[0]),
          ),
        ),
    ]);
  const weeklyReports = await db
    .select({
      authorId: report.authorId,
      weekStart: report.weekStart,
      status: report.status,
      dueAt: report.dueAt,
    })
    .from(report)
    .where(
      and(
        eq(report.organizationId, organizationId),
        eq(report.type, "WEEKLY"),
        eq(report.weekStart, period.weekStart),
      ),
    );
  const period = weeklyPeriod(
    shanghaiDate(now),
    Object.fromEntries(calendar.map((day) => [day.date, day.isWorkday])),
  );
  const reminders = [
    ...dueReminders({
      now,
      members,
      bosses: bosses.map((boss) => boss.id),
      reports: reports.map((item) => ({
        ...item,
        reportDate: item.reportDate!,
      })),
      overrides: Object.fromEntries(
        calendar.map((day) => [day.date, day.isWorkday]),
      ),
      exemptions,
    }),
    ...weeklyReminders({
      now,
      members,
      reports: weeklyReports.map((item) => ({
        ...item,
        weekStart: item.weekStart!,
      })),
      weekStart: period.weekStart,
      dueAt: deadline(period.dueDate),
    }),
    ...overdueBlockerReminders({
      now,
      bosses: bosses.map((boss) => boss.id),
      blockers,
    }),
  ];
  if (reminders.length)
    await db
      .insert(notification)
      .values(
        reminders.map((item) => ({
          id: crypto.randomUUID(),
          organizationId,
          recipientId: item.recipientId,
          dedupeKey: item.dedupeKey,
          type: item.type,
          title: item.title,
          link: "blockerId" in item ? `/blockers/${item.blockerId}` : "/daily",
        })),
      )
      .onConflictDoNothing();
  console.log(
    `Reminder run complete: ${reminders.length} candidate notifications.`,
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Reminder run failed");
  process.exitCode = 1;
});
