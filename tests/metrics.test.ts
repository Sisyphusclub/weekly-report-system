import { expect, it } from "vitest";
import { submissionRate, summarizeDeliverables } from "../src/lib/metrics";
import { weekDates } from "../src/lib/domain";
it("按统一口径计算提交率", () => {
  expect(submissionRate(4, 5)).toBe(80);
  expect(submissionRate(0, 0)).toBeNull();
});
it("从日报产出文本聚合量化交付物", () => {
  expect(
    summarizeDeliverables([
      { deliverables: ["教材 1 本", "章节 13 章"] },
      { deliverables: ["产出：章节 3 章", "缺陷说明"] },
    ]),
  ).toEqual([
    {
      unitId: "章节:章",
      label: "章节",
      unit: "章",
      unitName: "章节（章）",
      quantity: 16,
    },
    {
      unitId: "教材:本",
      label: "教材",
      unit: "本",
      unitName: "教材（本）",
      quantity: 1,
    },
    {
      unitId: "缺陷说明:",
      label: "缺陷说明",
      unit: "",
      unitName: "缺陷说明",
      quantity: 1,
    },
  ]);
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
