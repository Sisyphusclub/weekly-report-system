import { and, asc, count, eq, gte, inArray, lte, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  blocker,
  workTask,
  deliverable,
  deliverableUnit,
  project,
  projectMember,
  taskStatusHistory,
  user,
} from "@/lib/db/schema";
import { weekDates, type Actor } from "@/lib/domain";
import { shanghaiDate } from "@/lib/daily-input";
import { weeklySubmissionMetrics } from "@/lib/submission-metrics";
import { blockerVisibility } from "@/lib/blockers";
import { getSubmissionData, type SubmissionData } from "@/lib/submission-data";

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
    owner: { id: string; name: string } | null;
    members: Array<{ id: string; name: string }>;
    nextPlans: Array<{ id: string; content: string; assigneeId: string }>;
    deliverables: Array<{ unitId: string; unitName: string; quantity: number }>;
  }>;
  blockerTrend: Array<{ date: string; opened: number; resolved: number }>;
  blockerResolutionMedianHours: number | null;
  planFulfillment: { completed: number; due: number; rate: number | null };
};

export async function getDashboardBreakdown(
  actor: Actor,
  now = new Date(),
  submissionData?: SubmissionData,
): Promise<DashboardBreakdown> {
  const dates = weekDates(shanghaiDate(now));
  const db = getDb();
  const data = submissionData ?? (await getSubmissionData(actor, now));
  const [tasks, blockers, projects, deliveries] = await Promise.all([
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
        status: blocker.status,
        createdAt: blocker.createdAt,
        resolvedAt: blocker.resolvedAt,
      })
      .from(blocker)
      .where(blockerVisibility(actor)),
    db
      .select({ id: project.id, name: project.name, ownerId: project.ownerId })
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
  const projectIds = projects.map((item) => item.id);
  const [projectPeople, owners, nextPlans, duePlans] = await Promise.all([
    projectIds.length
      ? db
          .select({
            projectId: projectMember.projectId,
            id: user.id,
            name: user.name,
          })
          .from(projectMember)
          .innerJoin(user, eq(user.id, projectMember.userId))
          .where(
            and(
              eq(projectMember.organizationId, actor.organizationId),
              inArray(projectMember.projectId, projectIds),
            ),
          )
      : [],
    projectIds.length
      ? db
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(
            and(
              eq(user.organizationId, actor.organizationId),
              inArray(
                user.id,
                projects.map((item) => item.ownerId),
              ),
            ),
          )
      : [],
    projectIds.length
      ? db
          .select({
            id: workTask.id,
            projectId: workTask.projectId,
            content: workTask.content,
            assigneeId: workTask.primaryAssigneeId,
          })
          .from(workTask)
          .where(
            and(
              eq(workTask.organizationId, actor.organizationId),
              inArray(workTask.projectId, projectIds),
              eq(workTask.kind, "PLAN"),
              gte(workTask.dueDate, dates[0]),
              lte(workTask.dueDate, dates[6]),
            ),
          )
          .orderBy(asc(workTask.dueDate), asc(workTask.id))
      : [],
    db
      .select({
        id: workTask.id,
        status: workTask.status,
        dueDate: workTask.dueDate,
      })
      .from(workTask)
      .where(
        and(
          eq(workTask.organizationId, actor.organizationId),
          eq(workTask.kind, "PLAN"),
          gte(workTask.dueDate, dates[0]),
          lte(workTask.dueDate, dates[6]),
        ),
      ),
  ]);
  const ownerById = new Map(owners.map((item) => [item.id, item]));
  const memberRows = data.members.map((member) => {
    const submissions = weeklySubmissionMetrics({ ...data, members: [member] });
    return {
      id: member.id,
      name: member.name,
      due: submissions.dueReports,
      submitted: submissions.submittedReports,
      openBlockers: blockers.filter(
        (row) =>
          row.status !== "RESOLVED" &&
          (row.reporterId === member.id || row.coordinatorId === member.id),
      ).length,
      completed: tasks.filter(
        (task) =>
          task.primaryAssigneeId === member.id && task.status === "DONE",
      ).length,
    };
  });
  const blockerTrend = dates.map((date) => ({
    date,
    opened: blockers.filter((item) => shanghaiDate(item.createdAt) === date)
      .length,
    resolved: blockers.filter(
      (item) => item.resolvedAt && shanghaiDate(item.resolvedAt) === date,
    ).length,
  }));
  const resolutionDurations = blockers
    .filter((item) => item.resolvedAt)
    .map(
      (item) =>
        (item.resolvedAt!.getTime() - item.createdAt.getTime()) / 3_600_000,
    )
    .filter((hours) => hours >= 0)
    .sort((a, b) => a - b);
  const middle = Math.floor(resolutionDurations.length / 2);
  const blockerResolutionMedianHours = resolutionDurations.length
    ? Number(
        (resolutionDurations.length % 2
          ? resolutionDurations[middle]
          : (resolutionDurations[middle - 1] + resolutionDurations[middle]) / 2
        ).toFixed(1),
      )
    : null;
  const duePlanIds = duePlans.map((plan) => plan.id);
  const planHistory = duePlanIds.length
    ? await db
        .select({
          taskId: taskStatusHistory.taskId,
          toStatus: taskStatusHistory.toStatus,
          changedAt: taskStatusHistory.changedAt,
        })
        .from(taskStatusHistory)
        .where(
          and(
            eq(taskStatusHistory.organizationId, actor.organizationId),
            inArray(taskStatusHistory.taskId, duePlanIds),
          ),
        )
        .orderBy(asc(taskStatusHistory.changedAt), asc(taskStatusHistory.id))
    : [];
  const completedPlans = duePlans.filter((plan) => {
    const cutoff = new Date(`${plan.dueDate}T23:59:59.999+08:00`);
    const history = planHistory.filter(
      (entry) => entry.taskId === plan.id && entry.changedAt <= cutoff,
    );
    return (history.at(-1)?.toStatus ?? plan.status) === "DONE";
  }).length;
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
      owner: ownerById.get(item.ownerId) ?? null,
      members: projectPeople
        .filter((person) => person.projectId === item.id)
        .map(({ id, name }) => ({ id, name })),
      nextPlans: nextPlans.filter((plan) => plan.projectId === item.id),
      deliverables: [...totals.values()],
    };
  });
  return {
    members: memberRows,
    projects: projectRows,
    blockerTrend,
    blockerResolutionMedianHours,
    planFulfillment: {
      completed: completedPlans,
      due: duePlans.length,
      rate: duePlans.length
        ? Math.round((completedPlans / duePlans.length) * 100)
        : null,
    },
  };
}

export function submissionRate(submitted: number, due: number) {
  return due === 0 ? null : Math.round((submitted / due) * 100);
}

export async function getDashboardMetrics(
  actor: Actor,
  now = new Date(),
  submissionData?: SubmissionData,
): Promise<DashboardMetrics> {
  const organizationId = actor.organizationId;
  const dates = weekDates(shanghaiDate(now));
  const start = dates[0];
  const end = dates[6];
  const db = getDb();
  const data = submissionData ?? (await getSubmissionData(actor, now));
  const [open, urgent, progress, done] = await Promise.all([
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
  return {
    ...weeklySubmissionMetrics(data),
    openBlockers: open[0].value,
    urgentBlockers: urgent[0].value,
    inProgressTasks: progress[0].value,
    completedTasks: done[0].value,
  };
}
