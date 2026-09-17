import { expect, it } from "vitest";
import { calendarInput } from "../src/lib/calendar-input";
const input = {
  date: "2026-09-18",
  isWorkday: false,
  description: "公司休息日",
  version: 0,
};
it("支持新日期覆盖和后续版本", () => {
  expect(calendarInput.safeParse(input).success).toBe(true);
  expect(
    calendarInput.safeParse({ ...input, version: 2, isWorkday: true }).success,
  ).toBe(true);
});
it.each([
  { date: "2026-02-30" },
  { description: " " },
  { version: -1 },
  { version: 1.5 },
  { isWorkday: "false" },
])("拒绝无效日历输入：%j", (changes) => {
  expect(calendarInput.safeParse({ ...input, ...changes }).success).toBe(false);
});
