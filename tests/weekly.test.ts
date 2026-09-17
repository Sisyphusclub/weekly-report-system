import { expect, it } from "vitest";
import { buildWeeklySnapshot, weeklyPeriod } from "../src/lib/domain";
it("按周一至周日生成周报周期", () => {
  expect(weeklyPeriod("2026-09-17")).toEqual({
    weekStart: "2026-09-14",
    weekEnd: "2026-09-20",
    weekLabel: "2026-09-18",
    dueDate: "2026-09-18",
  });
});
it("调休工作日决定截止日", () => {
  expect(weeklyPeriod("2026-09-17", { "2026-09-20": true }).dueDate).toBe(
    "2026-09-20",
  );
});
it("缺少日报时禁止生成快照", () => {
  expect(() =>
    buildWeeklySnapshot("2026-09-17", [
      { reportDate: "2026-09-14", submitted: true },
    ]),
  ).toThrow("未提交日报");
});
it("快照保留来源和总结", () => {
  const result = buildWeeklySnapshot(
    "2026-09-17",
    ["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18"].map(
      (reportDate) => ({ reportDate, submitted: true, summary: reportDate }),
    ),
  );
  expect(result.sourceDates).toHaveLength(5);
  expect(result.summaries[0].summary).toBe("2026-09-14");
});
