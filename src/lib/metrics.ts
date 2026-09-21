import { and, count, eq, gte, inArray, lte, ne, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { blocker, project, projectMember, report, user } from "@/lib/db/schema";
import { weekDates, type Actor } from "@/lib/domain";
import { dailyEntriesSchema, shanghaiDate } from "@/lib/daily-input";
import { weeklySubmissionMetrics } from "@/lib/submission-metrics";
import { blockerVisibility } from "@/lib/blockers";
import { getSubmissionData, type SubmissionData } from "@/lib/submission-data";

export type DashboardMetrics = {
  totalTasks: number;
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
    todayPlans: number;
    todayActuals: number;
    todayCompleted: number;
    todaySubmitted: boolean;
    todayPlanItems: Array<{
      content: string;
      status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED";
      category: string;
      projectId: string | null | undefined;
      deliverables: string[];
    }>;
    todayActualItems: Array<{
      content: string;
      status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED";
      category: string;
      projectId: string | null | undefined;
      deliverables: string[];
    }>;
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
  todayPlanFulfillment: { completed: number; due: number; rate: number | null };
  memberDeliverables: Array<{
    memberId: string;
    memberName: string;
    unitId: string;
    unitName: string;
    quantity: number;
  }>;
  categoryBreakdown: Array<{ name: string; value: number }>;
  deliverableSummary: Array<{
    unitId: string;
    label: string;
    unit: string;
    unitName: string;
    quantity: number;
  }>;
  blockerItems: Array<{
    id: string;
    reporterId: string;
    coordinatorId: string | null;
    projectName: string;
    description: string;
    severity: "NORMAL" | "IMPORTANT" | "URGENT";
  }>;
};
export type DashboardDateRange = { from: string; to: string };

export async function getDashboardBreakdown(
  actor: Actor,
  now = new Date(),
  submissionData?: SubmissionData,
  range?: DashboardDateRange,
): Promise<DashboardBreakdown> {
  const dates = range ? [range.from, range.to] : weekDates(shanghaiDate(now));
  const start = dates[0];
  const end = dates[dates.length - 1];
  const db = getDb();
  const data = submissionData ?? (await getSubmissionData(actor, now));
  const employeeProjectIds =
    actor.role === "EMPLOYEE"
      ? db
          .select({ projectId: projectMember.projectId })
          .from(projectMember)
          .where(
            and(
              eq(projectMember.organizationId, actor.organizationId),
              eq(projectMember.userId, actor.id),
            ),
          )
          .then((memberships) => [
            ...new Set(memberships.map((item) => item.projectId)),
          ])
      : Promise.resolve(null);
  const resolvedEmployeeProjectIds = await employeeProjectIds;
  const [dailyReports, blockers, projects] = await Promise.all([
    db
      .select({
        id: report.id,
        authorId: report.authorId,
        reportDate: report.reportDate,
        status: report.status,
        planEntries: report.planEntries,
        workEntries: report.workEntries,
      })
      .from(report)
      .where(
        and(
          eq(report.organizationId, actor.organizationId),
          eq(report.type, "DAILY"),
          eq(report.status, "SUBMITTED"),
          gte(report.reportDate, start),
          lte(report.reportDate, end),
        ),
      ),
    db
      .select({
        reporterId: blocker.reporterId,
        coordinatorId: blocker.coordinatorId,
        id: blocker.id,
        projectId: blocker.projectId,
        description: blocker.description,
        severity: blocker.severity,
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
          actor.role === "EMPLOYEE"
            ? resolvedEmployeeProjectIds?.length
              ? or(
                  eq(project.ownerId, actor.id),
                  inArray(project.id, resolvedEmployeeProjectIds),
                )
              : eq(project.ownerId, actor.id)
            : undefined,
        ),
      ),
  ]);
  const projectIds = projects.map((item) => item.id);
  const structuredReports = dailyReports.map((item) => {
    const plans = dailyEntriesSchema.safeParse(item.planEntries);
    const works = dailyEntriesSchema.safeParse(item.workEntries);
    return {
      ...item,
      reportDate: item.reportDate ?? start,
      plans: plans.success ? plans.data : [],
      works: works.success ? works.data : [],
    };
  });
  const planRows = structuredReports.flatMap((item) =>
    item.plans.map((entry, index) => ({
      ...entry,
      id: `${item.id}:plan:${index}`,
      authorId: item.authorId,
      reportDate: item.reportDate,
    })),
  );
  const workRows = structuredReports.flatMap((item) =>
    item.works.map((entry, index) => ({
      ...entry,
      id: `${item.id}:work:${index}`,
      authorId: item.authorId,
      reportDate: item.reportDate,
    })),
  );
  const [projectPeople, owners] = await Promise.all([
    projectIds.length
      ? db
          .select({
            projectId: projectMember.projectId,
            id: user.id,
            name: user.name,
          })
          .from(projectMember)
          .innerJoin(
            user,
            and(
              eq(user.id, projectMember.userId),
              eq(user.organizationId, projectMember.organizationId),
            ),
          )
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
  ]);
  const ownerById = new Map(owners.map((item) => [item.id, item]));
  const today = shanghaiDate(now);
  const memberRows = data.members.map((member) => {
    const submissions = weeklySubmissionMetrics({ ...data, members: [member] });
    const todayReport = structuredReports.find(
      (item) => item.authorId === member.id && item.reportDate === today,
    );
    const todayPlans = todayReport?.plans ?? [];
    const todayWorks = todayReport?.works ?? [];
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
      completed: workRows.filter(
        (entry) => entry.authorId === member.id && entry.status === "DONE",
      ).length,
      todayPlans: todayPlans.length,
      todayActuals: todayWorks.length,
      todayCompleted: todayWorks.filter((entry) => entry.status === "DONE")
        .length,
      todaySubmitted: Boolean(todayReport),
      todayPlanItems: todayPlans.map(
        ({ content, status, category, projectId, deliverables }) => ({
          content,
          status,
          category,
          projectId,
          deliverables,
        }),
      ),
      todayActualItems: todayWorks.map(
        ({ content, status, category, projectId, deliverables }) => ({
          content,
          status,
          category,
          projectId,
          deliverables,
        }),
      ),
    };
  });
  const trendDates = range ? dateRange(start, end) : dates;
  const blockerTrend = trendDates.map((date) => ({
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
  const completedPlans = planRows.filter(
    (plan) => plan.status === "DONE",
  ).length;
  const todayDuePlans = planRows.filter((plan) => plan.reportDate === today);
  const todayCompletedPlans = todayDuePlans.filter(
    (plan) => plan.status === "DONE",
  ).length;
  const projectRows = projects.map((item) => {
    const projectWorks = workRows.filter(
      (entry) => entry.projectId === item.id,
    );
    const projectPlans = planRows.filter(
      (entry) => entry.projectId === item.id && entry.reportDate === today,
    );
    return {
      id: item.id,
      name: item.name,
      completed: projectWorks.filter((entry) => entry.status === "DONE").length,
      inProgress: projectWorks.filter((entry) => entry.status === "IN_PROGRESS")
        .length,
      blocked: projectWorks.filter((entry) => entry.status === "BLOCKED")
        .length,
      owner: ownerById.get(item.ownerId) ?? null,
      members: projectPeople
        .filter((person) => person.projectId === item.id)
        .map(({ id, name }) => ({ id, name })),
      nextPlans: projectPlans.map((plan) => ({
        id: plan.id,
        content: plan.content,
        assigneeId: plan.authorId,
      })),
      deliverables: summarizeDeliverables(projectWorks),
    };
  });
  const memberNames = new Map(
    data.members.map((member) => [member.id, member.name]),
  );
  const categoryTotals = workRows.reduce((map, entry) => {
    const name = entry.category.trim() || "未分类";
    map.set(name, (map.get(name) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const deliverableSummary = summarizeDeliverables(workRows);
  const projectNames = new Map(projectRows.map((item) => [item.id, item.name]));
  const blockerItems = blockers
    .filter((item) => item.status !== "RESOLVED")
    .sort((a, b) => {
      const rank = { URGENT: 0, IMPORTANT: 1, NORMAL: 2 } as const;
      return rank[a.severity] - rank[b.severity];
    })
    .map((item) => ({
      id: item.id,
      reporterId: item.reporterId,
      coordinatorId: item.coordinatorId,
      projectName: item.projectId
        ? (projectNames.get(item.projectId) ?? "未关联项目")
        : "未关联项目",
      description: item.description,
      severity: item.severity,
    }));
  const memberDeliverables = data.members.flatMap((member) =>
    summarizeDeliverables(
      workRows.filter((entry) => entry.authorId === member.id),
    ).map((delivery) => ({
      memberId: member.id,
      memberName: memberNames.get(member.id) ?? "未知成员",
      ...delivery,
    })),
  );
  return {
    members: memberRows,
    projects: projectRows,
    blockerTrend,
    blockerResolutionMedianHours,
    planFulfillment: {
      completed: completedPlans,
      due: planRows.length,
      rate: planRows.length
        ? Math.round((completedPlans / planRows.length) * 100)
        : null,
    },
    todayPlanFulfillment: {
      completed: todayCompletedPlans,
      due: todayDuePlans.length,
      rate: todayDuePlans.length
        ? Math.round((todayCompletedPlans / todayDuePlans.length) * 100)
        : null,
    },
    memberDeliverables,
    categoryBreakdown: [...categoryTotals.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    deliverableSummary,
    blockerItems,
  };
}

export function summarizeDeliverables(
  entries: Array<{ deliverables: string[] }>,
) {
  const totals = new Map<
    string,
    {
      unitId: string;
      label: string;
      unit: string;
      unitName: string;
      quantity: number;
    }
  >();
  for (const raw of entries.flatMap((entry) => entry.deliverables)) {
    const normalized = raw.trim().replace(/^产出[：:]\s*/, "");
    if (!normalized) continue;
    const match = normalized.match(/^(.*?)\s*(\d+(?:\.\d+)?)\s*([^\d\s]+)?$/u);
    const label = match?.[1]?.trim() || normalized;
    const quantity = match ? Number(match[2]) : 1;
    const unit = match?.[3]?.trim() ?? "";
    const unitName = unit ? `${label}（${unit}）` : label;
    const unitId = `${label}:${unit}`;
    const current = totals.get(unitId);
    totals.set(unitId, {
      unitId,
      label,
      unit,
      unitName,
      quantity: (current?.quantity ?? 0) + quantity,
    });
  }
  return [...totals.values()].sort((a, b) => b.quantity - a.quantity);
}

function dateRange(from: string, to: string) {
  const result: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end && result.length < 366) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
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
  const [open, urgent, weeklyReports] = await Promise.all([
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
      .select({ workEntries: report.workEntries })
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
  ]);
  const weeklyWorks = weeklyReports.flatMap((item) => {
    const parsed = dailyEntriesSchema.safeParse(item.workEntries);
    return parsed.success ? parsed.data : [];
  });
  return {
    totalTasks: weeklyWorks.length,
    ...weeklySubmissionMetrics(data),
    openBlockers: open[0].value,
    urgentBlockers: urgent[0].value,
    inProgressTasks: weeklyWorks.filter((item) => item.status === "IN_PROGRESS")
      .length,
    completedTasks: weeklyWorks.filter((item) => item.status === "DONE").length,
  };
}
