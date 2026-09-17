import { and, eq, gte, lte, ne } from "drizzle-orm";
import { getDb } from "../src/lib/db/index.js";
import {
  auditLog,
  report,
  reportingExemption,
  user,
  workCalendarDay,
} from "../src/lib/db/schema.js";
import {
  draftSummary,
  shouldGenerateWeeklyDraft,
} from "../src/lib/weekly-draft.js";
import { deadline, weekDates, weeklyPeriod } from "../src/lib/domain.js";
import { shanghaiDate } from "../src/lib/daily-input.js";

async function main() {
  const now = new Date();
  const organizationId = process.env.REMINDER_ORGANIZATION_ID;
  if (!organizationId) throw new Error("REMINDER_ORGANIZATION_ID is required");
  const db = getDb();
  const dates = weekDates(shanghaiDate(now));
  const [members, calendar] = await Promise.all([
    db
      .select({ id: user.id })
      .from(user)
      .where(
        and(
          eq(user.organizationId, organizationId),
          eq(user.status, "ACTIVE"),
          ne(user.role, "ADMIN"),
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
          eq(workCalendarDay.organizationId, organizationId),
          gte(workCalendarDay.date, dates[0]),
          lte(workCalendarDay.date, dates[6]),
        ),
      ),
  ]);
  const overrides = Object.fromEntries(
    calendar.map((day) => [day.date, day.isWorkday]),
  );
  const period = weeklyPeriod(shanghaiDate(now), overrides);
  for (const member of members) {
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: report.id, status: report.status })
        .from(report)
        .where(
          and(
            eq(report.organizationId, organizationId),
            eq(report.authorId, member.id),
            eq(report.type, "WEEKLY"),
            eq(report.weekStart, period.weekStart),
          ),
        )
        .limit(1);
      const [daily] = await tx
        .select({
          id: report.id,
          reportDate: report.reportDate,
          summary: report.summary,
          status: report.status,
        })
        .from(report)
        .where(
          and(
            eq(report.organizationId, organizationId),
            eq(report.authorId, member.id),
            eq(report.type, "DAILY"),
            eq(report.status, "SUBMITTED"),
            gte(report.reportDate, period.weekStart),
            lte(report.reportDate, period.weekEnd),
          ),
        )
        .orderBy(report.reportDate);
      const dueAt = deadline(period.dueDate);
      if (
        !shouldGenerateWeeklyDraft({
          now,
          dueAt,
          existing: Boolean(existing),
          submitted: existing?.status === "SUBMITTED",
        })
      )
        return;
      const id = crypto.randomUUID();
      await tx.insert(report).values({
        id,
        organizationId,
        authorId: member.id,
        type: "WEEKLY",
        weekStart: period.weekStart,
        weekEnd: period.weekEnd,
        weekLabel: period.weekLabel,
        dueAt,
        summary: draftSummary(
          daily ? [{ date: daily.reportDate!, summary: daily.summary }] : [],
        ),
        calendarVersion: Math.max(0, ...calendar.map((day) => day.version)),
        version: 1,
      });
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId,
        actorId: member.id,
        action: "WEEKLY_DRAFT_GENERATE",
        resourceType: "REPORT",
        resourceId: id,
        result: "SUCCESS",
      });
    });
  }
  console.log("Weekly draft generation complete.");
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Weekly draft generation failed",
  );
  process.exitCode = 1;
});
