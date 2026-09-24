import { and, asc, eq, gte, lte, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Button } from "@/components/motion/button/base";
import { DatePicker } from "@/components/premium/forms";
import { PageHeading } from "@/components/dashboard/page-heading";
import {
  BossWeeklyDashboard,
  type BossWeeklyMember,
} from "@/components/dashboard/boss-weekly-dashboard";
import { WorkspaceShell } from "@/components/workspace/shell";
import { requireUser } from "@/lib/access";
import { blockerVisibility } from "@/lib/blockers";
import { dateInput, dailyEntriesSchema, shanghaiDate } from "@/lib/daily-input";
import { getDb } from "@/lib/db";
import {
  blocker,
  report,
  reportingExemption,
  user,
  workCalendarDay,
} from "@/lib/db/schema";
import { isWorkday, weekDates } from "@/lib/domain";

export const metadata = { title: "周报看板" };

export default async function BossWeeklyPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const actor = await requireUser();
  if (actor.role !== "BOSS") redirect("/weekly");

  const params = await searchParams;
  const selectedDate = dateInput.catch(shanghaiDate()).parse(params.date);
  const dates = weekDates(selectedDate);
  const [weekStart, weekEnd, weekLabel] = [dates[0], dates[6], dates[4]];
  const today = shanghaiDate();
  const db = getDb();

  const [members, weeklyRows, dailyRows, exemptions, calendarRows, blockers] =
    await Promise.all([
      db
        .select({
          id: user.id,
          name: user.name,
          title: user.title,
          createdAt: user.createdAt,
        })
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
          status: report.status,
          summary: report.summary,
        })
        .from(report)
        .where(
          and(
            eq(report.organizationId, actor.organizationId),
            eq(report.type, "WEEKLY"),
            eq(report.weekStart, weekStart),
          ),
        ),
      db
        .select({
          authorId: report.authorId,
          reportDate: report.reportDate,
          status: report.status,
          workEntries: report.workEntries,
        })
        .from(report)
        .where(
          and(
            eq(report.organizationId, actor.organizationId),
            eq(report.type, "DAILY"),
            gte(report.reportDate, weekStart),
            lte(report.reportDate, weekEnd),
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
            lte(reportingExemption.startDate, weekEnd),
            gte(reportingExemption.endDate, weekStart),
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
            gte(workCalendarDay.date, weekStart),
            lte(workCalendarDay.date, weekEnd),
          ),
        )
        .orderBy(asc(workCalendarDay.date), asc(workCalendarDay.version)),
      db
        .select({ reporterId: blocker.reporterId, status: blocker.status })
        .from(blocker)
        .where(
          and(
            blockerVisibility(actor),
            ne(blocker.status, "RESOLVED"),
            gte(blocker.createdAt, new Date(`${weekStart}T00:00:00+08:00`)),
            lte(blocker.createdAt, new Date(`${weekEnd}T23:59:59+08:00`)),
          ),
        ),
    ]);

  const overrides: Record<string, boolean> = {};
  for (const row of calendarRows) {
    if (!(row.date in overrides)) overrides[row.date] = row.isWorkday;
  }
  const eligibleDates = dates.filter(
    (date) => date <= today && isWorkday(date, overrides),
  );
  const weeklyByMember = new Map(weeklyRows.map((row) => [row.authorId, row]));
  const exemptionByMember = new Map<string, typeof exemptions>();
  for (const exemption of exemptions) {
    const rows = exemptionByMember.get(exemption.userId) ?? [];
    rows.push(exemption);
    exemptionByMember.set(exemption.userId, rows);
  }
  const dailyByMember = new Map<string, typeof dailyRows>();
  for (const row of dailyRows) {
    const rows = dailyByMember.get(row.authorId) ?? [];
    rows.push(row);
    dailyByMember.set(row.authorId, rows);
  }
  const blockersByMember = new Map<string, number>();
  for (const row of blockers) {
    if (row.status === "RESOLVED") continue;
    blockersByMember.set(
      row.reporterId,
      (blockersByMember.get(row.reporterId) ?? 0) + 1,
    );
  }

  const memberRows: BossWeeklyMember[] = members.map((member) => {
    const expectedDates = eligibleDates.filter((date) => {
      if (date < shanghaiDate(member.createdAt)) return false;
      return !(exemptionByMember.get(member.id) ?? []).some(
        (item) => item.startDate <= date && item.endDate >= date,
      );
    });
    const daily = dailyByMember.get(member.id) ?? [];
    const submittedDaily = daily.filter(
      (row) =>
        row.status === "SUBMITTED" &&
        row.reportDate &&
        expectedDates.includes(row.reportDate),
    );
    const weekly = weeklyByMember.get(member.id);
    const weeklyStatus = weekly?.status ?? "MISSING";
    const workEntries = submittedDaily.flatMap((row) => {
      const parsed = dailyEntriesSchema.safeParse(row.workEntries);
      return parsed.success ? parsed.data : [];
    });
    return {
      id: member.id,
      name: member.name,
      title: member.title,
      weeklyStatus,
      reportId:
        weekly &&
        (weekly.status === "SUBMITTED" || weekly.authorId === actor.id)
          ? weekly.id
          : null,
      summary:
        weekly &&
        (weekly.status === "SUBMITTED" || weekly.authorId === actor.id)
          ? (weekly.summary?.trim() ?? "")
          : "",
      dailySubmitted: submittedDaily.length,
      dailyExpected: expectedDates.length,
      completedTasks: workEntries.filter((entry) => entry.status === "DONE")
        .length,
      inProgressTasks: workEntries.filter(
        (entry) => entry.status === "IN_PROGRESS",
      ).length,
      openBlockers: blockersByMember.get(member.id) ?? 0,
    };
  });

  const submitted = memberRows.filter(
    (member) => member.weeklyStatus === "SUBMITTED",
  ).length;
  const draft = memberRows.filter(
    (member) => member.weeklyStatus === "DRAFT",
  ).length;
  const dailyExpected = memberRows.reduce(
    (sum, member) => sum + member.dailyExpected,
    0,
  );
  const dailySubmitted = memberRows.reduce(
    (sum, member) => sum + member.dailySubmitted,
    0,
  );

  return (
    <WorkspaceShell actor={actor} selected="weekly">
      <PageHeading
        eyebrow="团队视角"
        title="周报看板"
        description="按周期查看团队周报提交、日报完成度和需要负责人介入的工作风险。"
        actions={
          <form
            action="/boss/weekly"
            className="flex flex-wrap items-end gap-2"
          >
            <DatePicker
              name="date"
              label="查看周期"
              defaultValue={selectedDate}
              size="small"
            />
            <Button type="submit" variant="secondary" size="small">
              切换周期
            </Button>
          </form>
        }
      />
      <BossWeeklyDashboard
        weekStart={weekStart}
        weekEnd={weekEnd}
        weekLabel={weekLabel}
        members={memberRows}
        stats={{
          totalMembers: memberRows.length,
          submitted,
          draft,
          missing: memberRows.length - submitted - draft,
          submissionRate: percent(submitted, memberRows.length),
          dailySubmitted,
          dailyExpected,
          dailyRate: percent(dailySubmitted, dailyExpected),
          completedTasks: memberRows.reduce(
            (sum, member) => sum + member.completedTasks,
            0,
          ),
          inProgressTasks: memberRows.reduce(
            (sum, member) => sum + member.inProgressTasks,
            0,
          ),
          openBlockers: memberRows.reduce(
            (sum, member) => sum + member.openBlockers,
            0,
          ),
        }}
      />
    </WorkspaceShell>
  );
}

function percent(value: number, total: number) {
  return total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
}
