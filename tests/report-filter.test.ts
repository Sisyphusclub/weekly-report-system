import { expect, it } from "vitest";
import { reportFilter, reportFilterParams } from "../src/lib/report-filter";
it("支持空范围和单侧日期", () => {
  expect(reportFilter.parse({ from: "", to: "" })).toEqual({
    from: undefined,
    to: undefined,
  });
  expect(reportFilter.safeParse({ from: "2026-09-18" }).success).toBe(true);
});
it("保留成员、类型和状态，分页与导出可复用同一组条件", () => {
  const filters = reportFilter.parse({
    member: "person-1",
    type: "DAILY",
    status: "SUBMITTED",
    from: "2026-09-01",
  });
  const link = new URLSearchParams(
    reportFilterParams("市场 & 活动", filters, 3),
  );
  expect(link.get("q")).toBe("市场 & 活动");
  expect(link.get("page")).toBe("3");
  expect(reportFilter.parse(Object.fromEntries(link))).toEqual(filters);
  expect(new URLSearchParams(reportFilterParams("", filters)).has("page")).toBe(
    false,
  );
});
it("支持项目、分类、任务状态和阻塞条件往返", () => {
  const filters = reportFilter.parse({
    project: "project-1",
    category: "category-1",
    taskStatus: "BLOCKED",
    blocked: "YES",
  });
  const link = new URLSearchParams(reportFilterParams("", filters));
  expect(reportFilter.parse(Object.fromEntries(link))).toEqual(filters);
});
it("全部选项不限制查询，非法条件不会退化为全量查询", () => {
  expect(
    reportFilter.parse({ member: "ALL", type: "ALL", status: "ALL" }),
  ).toEqual({ member: undefined, type: undefined, status: undefined });
  for (const filters of [
    { member: ["one", "two"] },
    { member: " " },
    { member: "a".repeat(201) },
    { status: "UNKNOWN" },
    { type: "MONTHLY" },
    { taskStatus: "UNKNOWN" },
    { blocked: "MAYBE" },
  ]) {
    expect(reportFilter.safeParse(filters).success).toBe(false);
  }
});
it("拒绝逆序、不存在的日期和重复参数", () => {
  expect(
    reportFilter.safeParse({ from: "2026-09-20", to: "2026-09-18" }).success,
  ).toBe(false);
  expect(reportFilter.safeParse({ from: "2026-02-30" }).success).toBe(false);
  expect(reportFilter.safeParse({ from: ["2026-09-18"] }).success).toBe(false);
});
