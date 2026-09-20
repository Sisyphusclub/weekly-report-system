import { describe, expect, it } from "vitest";
import {
  dailyBlockersSchema,
  dailyEntriesSchema,
  dailyInput,
  dateInput,
  shanghaiDate,
} from "../src/lib/daily-input";
describe("日报输入边界", () => {
  it("拒绝不存在的日期", () => {
    expect(dateInput.safeParse("2026-02-29").success).toBe(false);
    expect(dateInput.safeParse("2024-02-29").success).toBe(true);
  });
  it("强制提供版本，允许零表示新建", () => {
    expect(dailyInput.safeParse({ reportDate: "2026-09-17" }).success).toBe(
      false,
    );
    expect(
      dailyInput.safeParse({ reportDate: "2026-09-17", version: 0 }).success,
    ).toBe(true);
  });
  it("以北京时间跨日", () => {
    expect(shanghaiDate(new Date("2026-09-17T16:00:00Z"))).toBe("2026-09-18");
  });
  it("接受结构化计划、工作内容和多项产出", () => {
    const entry = {
      content: "协助教师导出整本教材资源",
      status: "DONE" as const,
      category: "综合事务",
      deliverables: ["教材1本", "章节13章"],
      projectId: null,
    };
    expect(dailyEntriesSchema.safeParse([entry]).success).toBe(true);
    expect(
      dailyInput.safeParse({
        reportDate: "2026-09-18",
        version: 0,
        plans: [entry],
        works: [entry],
      }).success,
    ).toBe(true);
  });
  it("要求阻塞关联有效项目和严重程度", () => {
    expect(
      dailyBlockersSchema.safeParse([
        { description: "等待项目方确认", projectId: "project-1", severity: "IMPORTANT" },
      ]).success,
    ).toBe(true);
    expect(
      dailyBlockersSchema.safeParse([
        { description: "等待项目方确认", projectId: "", severity: "IMPORTANT" },
      ]).success,
    ).toBe(false);
  });
  it("拒绝缺少内容或类型的日报条目", () => {
    expect(
      dailyEntriesSchema.safeParse([
        { content: "", status: "DONE", category: "测试", deliverables: [] },
      ]).success,
    ).toBe(false);
    expect(
      dailyEntriesSchema.safeParse([
        { content: "排查导出缺陷", status: "DONE", category: "", deliverables: [] },
      ]).success,
    ).toBe(false);
  });
});
