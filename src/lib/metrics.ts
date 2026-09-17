import { and, count, desc, eq, gte, lte, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  blocker,
  report,
  workTask,
  user,
  reportingExemption,
  workCalendarDay,
  deliverable,
  deliverableUnit,
  project,
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

export type DashboardBreakdown = {
  members: Array<{
    id: string;
    name: string;
    submitted: number;
    due: number;
    openBlockers: number;
    completed: number;
  }>;
  projects: Array<{
    id: string;
    name: string;
    completed: number;
    inProgress: number;
    blocked: number;
    deliverables: Array<{ unitId: string; unitName: string; quantity: number }>;
  }>;
};

export async function getDashboardBreakdown(
  actor: Actor,
  now = new Date(),
): Promise<DashboardBreakdown> {
  const dates = weekDates(shanghaiDate(now));
  const db = getDb();
  const [members, reports, tasks, blockers, projects, deliveries] =
    await Promise.all([
      db
        .select({ id: user.id, name: user.name, createdAt: user.createdAt })
        .from(user)
        .where(
          and(
            eq(user.organizationId, actor.organizationId),
            eq(user.status, "ACTIVE"),
            ne(user.role, "ADMIN"),
          ),
        ),
      db
        .select({
          authorId: report.authorId,
          reportDate: report.reportDate,
          status: report.status,
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
          id: workTask.id,
          primaryAssigneeId: workTask.primaryAssigneeId,
          projectId: workTask.projectId,
          status: workTask.status,
          workDate: workTask.workDate,
        })
        .from(workTask)
        .where(
          and(
            eq(workTask.organizationId, actor.organizationId),
            gte(workTask.workDate, dates[0]),
            lte(workTask.workDate, dates[6]),
          ),
        ),
      db
        .select({
          reporterId: blocker.reporterId,
          coordinatorId: blocker.coordinatorId,
        })
        .from(blocker)
        .where(and(blockerVisibility(actor), ne(blocker.status, "RESOLVED"))),
      db
        .select({ id: project.id, name: project.name })
        .from(project)
        .where(
          and(
            eq(project.organizationId, actor.organizationId),
            ne(project.status, "ARCHIVED"),
          ),
        ),
      db
        .select({
          taskId: deliverable.taskId,
          unitId: deliverable.unitId,
          unitName: deliverable.unitName,
          quantity: deliverable.quantity,
        })
        .from(deliverable)
        .innerJoin(
          deliverableUnit,
          and(
            eq(deliverableUnit.id, deliverable.unitId),
            eq(deliverableUnit.organizationId, deliverable.organizationId),
          ),
        )
        .where(eq(deliverable.organizationId, actor.organizationId)),
    ]);
  const reportSet = new Set(
    reports
      .filter((item) => item.status === "SUBMITTED")
      .map((item) => `${item.authorId}:${item.reportDate}`),
  );
  const memberRows = members.map((member) => {
    const due = dates.filter(
      (date) =>
        date >= shanghaiDate(member.createdAt) && date <= shanghaiDate(now),
    ).length;
    return {
      id: member.id,
      name: member.name,
      due,
      submitted: dates.filter((date) => reportSet.has(`${member.id}:${date}`))
        .length,
      openBlockers: blockers.filter(
        (row) =>
          row.reporterId === member.id || row.coordinatorId === member.id,
      ).length,
      completed: tasks.filter(
        (task) =>
          task.primaryAssigneeId === member.id && task.status === "DONE",
      ).length,
    };
  });
  const projectRows = projects.map((item) => {
    const projectTasks = tasks.filter((task) => task.projectId === item.id);
    const totals = new Map<
      string,
      { unitId: string; unitName: string; quantity: number }
    >();
    for (const delivery of deliveries.filter((row) =>
      projectTasks.some((task) => task.id === row.taskId),
    )) {
      const current = totals.get(delivery.unitId);
      totals.set(delivery.unitId, {
        unitId: delivery.unitId,
        unitName: delivery.unitName,
        quantity: (current?.quantity ?? 0) + Number(delivery.quantity),
      });
    }
    return {
      id: item.id,
      name: item.name,
      completed: projectTasks.filter((task) => task.status === "DONE").length,
      inProgress: projectTasks.filter((task) => task.status === "IN_PROGRESS")
        .length,
      blocked: projectTasks.filter((task) => task.status === "BLOCKED").length,
      deliverables: [...totals.values()],
    };
  });
  return { members: memberRows, projects: projectRows };
}

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
