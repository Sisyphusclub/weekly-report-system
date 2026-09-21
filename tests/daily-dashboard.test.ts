import { describe, expect, it } from "vitest";
import { buildDailyDashboard } from "../src/lib/daily-dashboard";

const members = [
  {
    id: "member-1",
    todayPlans: 2,
    todayActuals: 2,
    todayCompleted: 1,
    todayPlanItems: [
      entry("项目一计划", "TODO", "开发", "project-1"),
      entry("项目二计划", "DONE", "测试", "project-2"),
    ],
    todayActualItems: [
      entry("完成接口", "DONE", "开发", "project-1", ["接口 3 个"]),
      entry("回归测试", "IN_PROGRESS", "测试", "project-2", ["用例 10 条"]),
    ],
  },
];

describe("日报看板聚合", () => {
  it("按日报条目汇总计划、完成、待跟进、类型和产出", () => {
    const result = buildDailyDashboard(members);

    expect(result.summary).toEqual({
      workItems: 2,
      completed: 1,
      followUp: 1,
      plans: 2,
    });
    expect(result.categories).toEqual([
      { name: "开发", value: 1 },
      { name: "测试", value: 1 },
    ]);
    expect(
      result.deliverables.map(({ label, quantity, unit }) => ({
        label,
        quantity,
        unit,
      })),
    ).toEqual([
      { label: "用例", quantity: 10, unit: "条" },
      { label: "接口", quantity: 3, unit: "个" },
    ]);
  });

  it("项目筛选同步收敛成员条目和统计", () => {
    const result = buildDailyDashboard(members, "project-1");

    expect(result.members).toHaveLength(1);
    expect(result.summary).toEqual({
      workItems: 1,
      completed: 1,
      followUp: 0,
      plans: 1,
    });
    expect(result.categories).toEqual([{ name: "开发", value: 1 }]);
  });
});

function entry(
  content: string,
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED",
  category: string,
  projectId: string,
  deliverables: string[] = [],
) {
  return { content, status, category, projectId, deliverables };
}
