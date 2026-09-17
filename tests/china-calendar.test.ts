import { expect, it } from "vitest";
import { chinaCalendarPreset } from "@/lib/china-calendar";
it("生成 2026 年节假日和调休工作日", () => {
  const preset = chinaCalendarPreset(2026);
  expect(preset).toEqual(
    expect.arrayContaining([
      { date: "2026-02-17", isWorkday: false, description: "法定节假日" },
      {
        date: "2026-02-14",
        isWorkday: true,
        description: "法定节假日调休工作日",
      },
      { date: "2026-10-01", isWorkday: false, description: "法定节假日" },
    ]),
  );
});
it("未核对年份时拒绝静默生成日历", () =>
  expect(() => chinaCalendarPreset(2027)).toThrow());
