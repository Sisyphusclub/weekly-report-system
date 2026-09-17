import { describe, expect, it } from "vitest";
import { dailyInput, dateInput, shanghaiDate } from "../src/lib/daily-input";
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
});
