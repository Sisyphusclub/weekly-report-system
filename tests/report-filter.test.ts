import { expect, it } from "vitest";
import { reportFilter } from "../src/lib/report-filter";
it("支持空范围和单侧日期", () => {
  expect(reportFilter.parse({ from: "", to: "" })).toEqual({
    from: undefined,
    to: undefined,
  });
  expect(reportFilter.safeParse({ from: "2026-09-18" }).success).toBe(true);
});
it("拒绝逆序、不存在的日期和重复参数", () => {
  expect(
    reportFilter.safeParse({ from: "2026-09-20", to: "2026-09-18" }).success,
  ).toBe(false);
  expect(reportFilter.safeParse({ from: "2026-02-30" }).success).toBe(false);
  expect(reportFilter.safeParse({ from: ["2026-09-18"] }).success).toBe(false);
});
