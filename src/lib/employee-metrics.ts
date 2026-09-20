export type EmployeeDailyTaskMetric = {
  id: string;
  kind: "ACTUAL" | "PLAN";
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED";
  sourceTaskId: string | null;
};

export type EmployeeDailyMetrics = {
  planCount: number;
  completedCount: number;
  completedPlans: number;
  fulfillmentRate: number;
};

/** Shared employee-workbench metric semantics. */
export function employeeDailyMetrics(
  tasks: EmployeeDailyTaskMetric[],
): EmployeeDailyMetrics {
  const plans = tasks.filter((task) => task.kind === "PLAN");
  const actuals = tasks.filter((task) => task.kind === "ACTUAL");
  const completedPlanIds = new Set(
    actuals
      .filter((task) => task.status === "DONE" && task.sourceTaskId)
      .map((task) => task.sourceTaskId),
  );
  const completedPlans = plans.filter(
    (task) => task.status === "DONE" || completedPlanIds.has(task.id),
  ).length;
  return {
    planCount: plans.length,
    completedCount: actuals.filter((task) => task.status === "DONE").length,
    completedPlans,
    fulfillmentRate: plans.length
      ? Math.round((completedPlans / plans.length) * 100)
      : 0,
  };
}
