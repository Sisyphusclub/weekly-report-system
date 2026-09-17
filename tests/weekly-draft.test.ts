import { expect, it } from "vitest";
import { draftSummary, shouldGenerateWeeklyDraft } from "@/lib/weekly-draft";
it("只在截止时间到达且不存在报告时生成草稿", () => {
  const dueAt = new Date("2026-09-18T10:30:00Z");
  expect(
    shouldGenerateWeeklyDraft({
      now: new Date("2026-09-18T10:29:59Z"),
      dueAt,
      existing: false,
      submitted: false,
    }),
  ).toBe(false);
  expect(
    shouldGenerateWeeklyDraft({
      now: new Date("2026-09-18T10:30:00Z"),
      dueAt,
      existing: false,
      submitted: false,
    }),
  ).toBe(true);
  expect(
    shouldGenerateWeeklyDraft({
      now: new Date("2026-09-18T11:00:00Z"),
      dueAt,
      existing: true,
      submitted: false,
    }),
  ).toBe(false);
});
it("草稿总结只拼接有内容的已提交日报", () => {
  expect(
    draftSummary([
      { date: "2026-09-14", summary: "完成方案" },
      { date: "2026-09-15", summary: " " },
      { date: "2026-09-16", summary: null },
    ]),
  ).toBe("2026-09-14：完成方案");
});
