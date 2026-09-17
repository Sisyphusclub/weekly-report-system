export type Role = "EMPLOYEE" | "BOSS" | "ADMIN";
export type ReportStatus = "DRAFT" | "SUBMITTED";
export type TaskStatus =
  "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED";

export type Actor = { id: string; organizationId: string; role: Role };
type Report = {
  authorId: string;
  organizationId: string;
  status: ReportStatus;
};

export function canReadReport(actor: Actor, report: Report) {
  if (actor.organizationId !== report.organizationId) return false;
  if (actor.id === report.authorId) return true;
  return report.status === "SUBMITTED" && actor.role !== "ADMIN";
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("日期必须为 YYYY-MM-DD");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new Error("日期无效");
  return date;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function weekDates(date: string) {
  const current = parseDate(date);
  const day = current.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  current.setUTCDate(current.getUTCDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const result = new Date(current);
    result.setUTCDate(current.getUTCDate() + index);
    return isoDate(result);
  });
}

export function deadline(date: string) {
  const result = parseDate(date);
  result.setUTCHours(10, 30);
  return result;
}

export function validateSubmission(input: {
  tasks: Array<{ id: string; kind?: "ACTUAL" | "PLAN" }>;
  noWorkReason?: string;
  noPlanReason?: string;
}) {
  const hasWork = input.tasks.some((task) => task.kind !== "PLAN");
  const hasPlans = input.tasks.some((task) => task.kind === "PLAN");
  const hasWorkReason = Boolean(input.noWorkReason?.trim());
  const hasPlanReason = Boolean(input.noPlanReason?.trim());
  if (!hasWork && !hasWorkReason) throw new Error("请填写实际工作或无工作原因");
  if (!hasPlans && !hasPlanReason)
    throw new Error("请填写下一周期计划或无计划原因");
  return true;
}

export function summarizeDeliverables(
  tasks: Array<{
    id: string;
    deliverables: Array<{ unitId: string; quantity: number }>;
  }>,
) {
  const totals: Record<string, number> = Object.create(null);
  const seen = new Set<string>();
  for (const task of tasks) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    for (const deliverable of task.deliverables) {
      if (!Number.isFinite(deliverable.quantity) || deliverable.quantity < 0)
        throw new Error("交付物数量必须为非负有限数值");
      totals[deliverable.unitId] =
        (totals[deliverable.unitId] ?? 0) + deliverable.quantity;
    }
  }
  return totals;
}

export type CalendarOverrides = Readonly<Record<string, boolean>>;

export function isWorkday(date: string, overrides: CalendarOverrides = {}) {
  const day = parseDate(date).getUTCDay();
  return overrides[date] ?? (day !== 0 && day !== 6);
}

export function weeklyDeadline(date: string, overrides: CalendarOverrides) {
  const last = weekDates(date)
    .filter((day) => isWorkday(day, overrides))
    .at(-1);
  return last ? deadline(last) : null;
}

export function missingDailyReports(
  date: string,
  submittedDates: string[],
  exemptDates: string[],
  overrides: CalendarOverrides,
) {
  const covered = new Set([...submittedDates, ...exemptDates]);
  return weekDates(date).filter(
    (day) => isWorkday(day, overrides) && !covered.has(day),
  );
}

export function canReadBlocker(
  actor: Actor,
  blocker: {
    organizationId: string;
    reporterId: string;
    coordinatorId?: string | null;
    isSensitive: boolean;
  },
) {
  if (actor.organizationId !== blocker.organizationId || actor.role === "ADMIN")
    return false;
  return (
    !blocker.isSensitive ||
    actor.role === "BOSS" ||
    actor.id === blocker.reporterId ||
    actor.id === blocker.coordinatorId
  );
}

export function revisionDecision(submittedAt: Date, now: Date) {
  const elapsed = now.getTime() - submittedAt.getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) throw new Error("修订时间无效");
  return elapsed <= 7 * 24 * 60 * 60 * 1000 ? "DIRECT" : "APPROVAL_REQUIRED";
}

export function rollPlan<
  T extends {
    id: string;
    dueDate: string;
    content: string;
    status: TaskStatus;
  },
>(task: T, nextId: string, nextDueDate: string) {
  parseDate(task.dueDate);
  parseDate(nextDueDate);
  if (["DONE", "CANCELED"].includes(task.status))
    throw new Error("已结束的计划不能滚动");
  if (nextDueDate <= task.dueDate || !nextId || nextId === task.id)
    throw new Error("新计划必须使用独立 ID 和后续日期");
  return {
    ...task,
    id: nextId,
    sourceTaskId: task.id,
    dueDate: nextDueDate,
    status: "TODO" as const,
    kind: "PLAN" as const,
  };
}
