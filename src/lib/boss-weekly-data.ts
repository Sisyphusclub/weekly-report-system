import { and, asc, desc, eq, gte, lte, ne } from "drizzle-orm";
import type {
  BossWeeklyMember,
  BossWeeklyStats,
} from "@/components/dashboard/boss-weekly-dashboard";
import { blockerVisibility } from "@/lib/blockers";
import { dailyEntriesSchema, shanghaiDate } from "@/lib/daily-input";
import { getDb } from "@/lib/db";
import {
  blocker,
  project,
  projectMember,
  report,
  reportingExemption,
  user,
  workCalendarDay,
} from "@/lib/db/schema";
import { type Actor, isWorkday, weekDates } from "@/lib/domain";

export async function getBossWeeklyData(
  actor: Actor,
  selectedDate: string,
  selectedProjectId?: string,
): Promise<{
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  members: BossWeeklyMember[];
  stats: BossWeeklyStats;
}> {
  const dates = weekDates(selectedDate);
  const [weekStart, weekEnd, weekLabel] = [dates[0], dates[6], dates[4]];
  const today = shanghaiDate();
  const db = getDb();

  const [
    members,
    weeklyRows,
    dailyRows,
    exemptions,
    calendarRows,
    blockers,
    projectScope,
  ] = await Promise.all([
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
      })
      .from(workCalendarDay)
      .where(
        and(
          eq(workCalendarDay.organizationId, actor.organizationId),
          gte(workCalendarDay.date, weekStart),
          lte(workCalendarDay.date, weekEnd),
        ),
      )
      .orderBy(asc(workCalendarDay.date), desc(workCalendarDay.version)),
    db
      .select({ reporterId: blocker.reporterId })
      .from(blocker)
      .where(
        and(
          blockerVisibility(actor),
          ne(blocker.status, "RESOLVED"),
          gte(blocker.createdAt, new Date(`${weekStart}T00:00:00+08:00`)),
          lte(blocker.createdAt, new Date(`${weekEnd}T23:59:59+08:00`)),
        ),
      ),
    selectedProjectId
      ? Promise.all([
          db
            .select({ ownerId: project.ownerId })
            .from(project)
            .where(
              and(
                eq(project.organizationId, actor.organizationId),
                eq(project.id, selectedProjectId),
                ne(project.status, "ARCHIVED"),
              ),
            )
            .limit(1),
          db
            .select({ userId: projectMember.userId })
            .from(projectMember)
            .where(
              and(
                eq(projectMember.organizationId, actor.organizationId),
                eq(projectMember.projectId, selectedProjectId),
              ),
            ),
        ])
      : Promise.resolve(null),
  ]);

  // 项目筛选限定参与成员；周报摘要和日报产出仍是这些成员的整周工作。
  const scopedIds = projectScope
    ? new Set(
        projectScope[0].length
          ? [
              projectScope[0][0].ownerId,
              ...projectScope[1].map((row) => row.userId),
            ]
          : [],
      )
    : null;
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
    blockersByMember.set(
      row.reporterId,
      (blockersByMember.get(row.reporterId) ?? 0) + 1,
    );
  }

  const memberRows: BossWeeklyMember[] = members
    .filter((member) => !scopedIds || scopedIds.has(member.id))
    .map((member) => {
      const expectedDates = eligibleDates.filter((date) => {
        if (date < shanghaiDate(member.createdAt)) return false;
        return !(exemptionByMember.get(member.id) ?? []).some(
          (item) => item.startDate <= date && item.endDate >= date,
        );
      });
      const submittedDaily = (dailyByMember.get(member.id) ?? []).filter(
        (row) =>
          row.status === "SUBMITTED" &&
          row.reportDate &&
          expectedDates.includes(row.reportDate),
      );
      const weekly = weeklyByMember.get(member.id);
      const workEntries = submittedDaily.flatMap((row) => {
        const parsed = dailyEntriesSchema.safeParse(row.workEntries);
        return parsed.success ? parsed.data : [];
      });
      return {
        id: member.id,
        name: member.name,
        title: member.title,
        weeklyStatus: weekly?.status ?? "MISSING",
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
  const percent = (value: number, total: number) =>
    total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;

  return {
    weekStart,
    weekEnd,
    weekLabel,
    members: memberRows,
    stats: {
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
    },
  };
}
