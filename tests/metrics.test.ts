import { expect, it } from "vitest";
import { submissionRate } from "../src/lib/metrics";
import { weekDates } from "../src/lib/domain";
it("按统一口径计算提交率", () => {
  expect(submissionRate(4, 5)).toBe(80);
  expect(submissionRate(0, 0)).toBeNull();
});
it("默认看板范围按自然周展开", () => {
  expect(weekDates("2026-09-18")).toEqual([
    "2026-09-14",
    "2026-09-15",
    "2026-09-16",
    "2026-09-17",
    "2026-09-18",
    "2026-09-19",
    "2026-09-20",
  ]);
});
