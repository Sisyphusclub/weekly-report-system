import { expect, it } from "vitest";
import { weeklyTaskSnapshot } from "../src/lib/weekly-task-snapshot";
it("重复任务保留每份日报事实，周报关联采用日期最新的快照", () => {
  const result = weeklyTaskSnapshot(
    [
      { id: "fri", reportDate: "2026-09-18", version: 3 },
      { id: "mon", reportDate: "2026-09-14", version: 1 },
    ],
    [
      { reportId: "fri", taskId: "task", snapshot: { status: "DONE" } },
      { reportId: "mon", taskId: "task", snapshot: { status: "TODO" } },
      { reportId: "other", taskId: "hidden", snapshot: {} },
    ],
  );
  expect(result.sourceReports.map((r) => r.version)).toEqual([1, 3]);
  expect(result.sourceReports[0].tasks[0].snapshot).toEqual({ status: "TODO" });
  expect(result.tasks).toEqual([
    { taskId: "task", sourceReportId: "fri", snapshot: { status: "DONE" } },
  ]);
});
it("来源对象变化不影响生成的快照", () => {
  const snapshot = { content: "原文" };
  const result = weeklyTaskSnapshot(
    [{ id: "day", reportDate: "2026-09-18", version: 1 }],
    [{ reportId: "day", taskId: "t", snapshot }],
  );
  snapshot.content = "修改后";
  expect(result.tasks[0].snapshot).toEqual({ content: "原文" });
});
