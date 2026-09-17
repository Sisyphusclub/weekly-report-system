import { expect, it } from "vitest";
import { weeklySubmissionMetrics } from "../src/lib/submission-metrics";
import { deadline } from "../src/lib/domain";
const base = {
  now: new Date("2026-09-18T11:00:00Z"),
  members: [{ id: "a", createdAt: new Date("2026-09-01T00:00:00Z") }],
  reports: [],
  exemptions: [],
  overrides: {},
};
it("即使没有日报记录也计入应提交数", () => {
  expect(weeklySubmissionMetrics(base)).toEqual({
    dueReports: 5,
    submittedReports: 0,
    onTimeReports: 0,
  });
});
it("免报与休息日从分母扣除，调休周末纳入", () => {
  expect(
    weeklySubmissionMetrics({
      ...base,
      now: new Date("2026-09-20T11:00:00Z"),
      overrides: { "2026-09-14": false, "2026-09-20": true },
      exemptions: [
        { userId: "a", startDate: "2026-09-15", endDate: "2026-09-16" },
      ],
    }).dueReports,
  ).toBe(3);
});
it("补交不增加按时提交数，非工作日提交不抬高分子", () => {
  const reports = ["2026-09-14", "2026-09-15", "2026-09-19"].map((date, i) => ({
    authorId: "a",
    reportDate: date,
    dueAt: deadline(date),
    status: "SUBMITTED",
    submittedAt: new Date(deadline(date).getTime() + (i === 1 ? 1000 : 0)),
  }));
  expect(
    weeklySubmissionMetrics({
      ...base,
      now: new Date("2026-09-20T11:00:00Z"),
      reports,
    }),
  ).toEqual({ dueReports: 5, submittedReports: 2, onTimeReports: 1 });
});
it("不统计入职前与未到截止时间的日期", () => {
  expect(
    weeklySubmissionMetrics({
      ...base,
      now: new Date("2026-09-18T10:00:00Z"),
      members: [{ id: "a", createdAt: new Date("2026-09-17T00:00:00Z") }],
    }).dueReports,
  ).toBe(1);
});
it("沿用报告保存的截止时间", () => {
  expect(
    weeklySubmissionMetrics({
      ...base,
      reports: [
        {
          authorId: "a",
          reportDate: "2026-09-18",
          status: "DRAFT",
          submittedAt: null,
          dueAt: new Date("2026-09-19T10:30:00Z"),
        },
      ],
    }).dueReports,
  ).toBe(4);
});
