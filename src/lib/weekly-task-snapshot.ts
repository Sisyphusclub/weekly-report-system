export function weeklyTaskSnapshot(
  sources: Array<{ id: string; reportDate: string | null; version: number }>,
  tasks: Array<{ reportId: string; taskId: string; snapshot: unknown }>,
) {
  const reports = [...sources].sort((a, b) =>
    (a.reportDate ?? "").localeCompare(b.reportDate ?? ""),
  );
  const sourceReports = reports.map((source) => ({
    ...source,
    tasks: tasks
      .filter((task) => task.reportId === source.id)
      .map((task) => ({
        taskId: task.taskId,
        snapshot: structuredClone(task.snapshot),
      })),
  }));
  const latest = new Map<
    string,
    { taskId: string; sourceReportId: string; snapshot: unknown }
  >();
  for (const source of sourceReports) {
    for (const task of source.tasks)
      latest.set(task.taskId, { ...task, sourceReportId: source.id });
  }
  return { sourceReports, tasks: [...latest.values()] };
}
