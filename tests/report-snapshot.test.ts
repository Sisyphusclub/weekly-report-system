import { expect, it } from "vitest";
import { reportSnapshot, reportSummaryDiff } from "@/lib/report-snapshot";
const task = {
  content: "提交方案",
  kind: "ACTUAL",
  status: "DONE",
  categoryName: "策划",
  deliverables: [{ unitId: "unit", unitName: "份", quantity: "2" }],
};
it("读取日报直接任务与周报嵌套任务，并保留冻结交付物", () => {
  const daily = reportSnapshot.parse({ summary: "当天总结", tasks: [task] });
  const weekly = reportSnapshot.parse({
    summary: "本周总结",
    tasks: [{ taskId: "task", sourceReportId: "daily", snapshot: task }],
  });
  expect(daily.tasks).toEqual(weekly.tasks);
  expect(weekly.tasks[0].deliverables[0]).toEqual(task.deliverables[0]);
});
it("损坏快照不会被静默展示为空报告", () => {
  expect(reportSnapshot.safeParse({ summary: "总结" }).success).toBe(false);
  expect(
    reportSnapshot.safeParse({ tasks: [{ snapshot: { content: "不完整" } }] })
      .success,
  ).toBe(false);
});
it("允许真正的空任务及空总结，解析总结变更", () => {
  expect(reportSnapshot.parse({ summary: null, tasks: [] }).tasks).toEqual([]);
  expect(
    reportSummaryDiff.parse({
      summary: [null, "补充说明"],
      approval: { reviewerId: "boss" },
    }).summary,
  ).toEqual([null, "补充说明"]);
});
