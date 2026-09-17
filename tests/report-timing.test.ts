import { expect, it } from "vitest";
import { reportTiming } from "../src/lib/report-timing";

it("上海时间十八点半截止，超过截止提交保留逾期", () => {
  const onTime = reportTiming(
    "2026-09-18",
    4,
    true,
    new Date("2026-09-18T10:30:00Z"),
  );
  expect(onTime.dueAt.toISOString()).toBe("2026-09-18T10:30:00.000Z");
  expect(onTime.wasLate).toBe(false);
  expect(
    reportTiming("2026-09-18", 4, true, new Date("2026-09-18T10:30:01Z"))
      .wasLate,
  ).toBe(true);
});

it("后续保存保留原截止日历和曾逾期状态", () => {
  const existing = {
    dueAt: new Date("2026-09-18T10:30:00Z"),
    calendarVersion: 2,
    wasLate: true,
  };
  expect(
    reportTiming(
      "2026-09-20",
      5,
      false,
      new Date("2026-09-19T00:00:00Z"),
      existing,
    ),
  ).toEqual(existing);
});

it("保存过期草稿不会被记作逾期提交", () => {
  expect(
    reportTiming("2026-09-18", 4, false, new Date("2026-09-19T00:00:00Z"))
      .wasLate,
  ).toBe(false);
});
