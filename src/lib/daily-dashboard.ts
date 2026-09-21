export type DailyDashboardEntry = {
  content: string;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED";
  category: string;
  projectId?: string | null;
  deliverables: string[];
};

export type DailyDashboardMember = {
  todayPlans: number;
  todayActuals: number;
  todayCompleted: number;
  todayPlanItems: DailyDashboardEntry[];
  todayActualItems: DailyDashboardEntry[];
};

export function buildDailyDashboard<T extends DailyDashboardMember>(
  members: readonly T[],
  projectId?: string,
) {
  const filteredMembers = members
    .map((member) => {
      const todayPlanItems = filterEntries(member.todayPlanItems, projectId);
      const todayActualItems = filterEntries(
        member.todayActualItems,
        projectId,
      ).filter((entry) => entry.status !== "CANCELED");
      return {
        ...member,
        todayPlans: todayPlanItems.length,
        todayActuals: todayActualItems.length,
        todayCompleted: todayActualItems.filter(
          (entry) => entry.status === "DONE",
        ).length,
        todayPlanItems,
        todayActualItems,
      };
    })
    .filter(
      (member) =>
        !projectId || member.todayPlans > 0 || member.todayActuals > 0,
    );
  const plans = filteredMembers.flatMap((member) => member.todayPlanItems);
  const works = filteredMembers.flatMap((member) => member.todayActualItems);
  const categoryTotals = works.reduce((totals, entry) => {
    const category = entry.category.trim() || "未分类";
    totals.set(category, (totals.get(category) ?? 0) + 1);
    return totals;
  }, new Map<string, number>());

  return {
    members: filteredMembers,
    summary: {
      workItems: works.length,
      completed: works.filter((entry) => entry.status === "DONE").length,
      followUp: works.filter((entry) => entry.status !== "DONE").length,
      plans: plans.filter((entry) => entry.status !== "CANCELED").length,
    },
    categories: [...categoryTotals.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    deliverables: summarizeDeliverables(works),
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
  return [...totals.values()].sort(
    (a, b) => b.quantity - a.quantity || a.label.localeCompare(b.label),
  );
}

function filterEntries(entries: DailyDashboardEntry[], projectId?: string) {
  return projectId
    ? entries.filter((entry) => entry.projectId === projectId)
    : entries;
}
