import { expect, it } from "vitest";
import {
  weeklySubmissionMetrics,
  dailySubmissionStatus,
} from "../src/lib/submission-metrics";
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
it("今日未提交在截止时间转为逾期，不区分无报告与草稿", () => {
  const member = base.members[0];
  const dueAt = deadline("2026-09-18");
  const draft = {
    authorId: "a",
    reportDate: "2026-09-18",
    status: "DRAFT",
    submittedAt: null,
    dueAt,
  };
  for (const reports of [[], [draft]]) {
    expect(
      dailySubmissionStatus(
        { ...base, reports, now: new Date(dueAt.getTime() - 1) },
        member,
      ),
    ).toBe("PENDING");
    expect(
      dailySubmissionStatus({ ...base, reports, now: dueAt }, member),
    ).toBe("OVERDUE");
  }
});
it("按上海日期判断休息、免报和入职边界", () => {
  const member = base.members[0];
  expect(
    dailySubmissionStatus(
      { ...base, now: new Date("2026-09-18T16:00:00Z") },
      member,
    ),
  ).toBe("REST_DAY");
  expect(
    dailySubmissionStatus(
      { ...base, overrides: { "2026-09-18": false } },
      member,
    ),
  ).toBe("REST_DAY");
  expect(
    dailySubmissionStatus(
      {
        ...base,
        exemptions: [
          { userId: "a", startDate: "2026-09-18", endDate: "2026-09-18" },
        ],
      },
      member,
    ),
  ).toBe("EXEMPT");
  expect(
    dailySubmissionStatus(base, {
      ...member,
      createdAt: new Date("2026-09-19T00:00:00Z"),
    }),
  ).toBe("NOT_STARTED");
  expect(
    dailySubmissionStatus(
      {
        ...base,
        now: new Date("2026-09-19T11:00:00Z"),
        overrides: { "2026-09-19": true },
      },
      member,
    ),
  ).toBe("OVERDUE");
});
it("按实际保存的截止时间区分准时与补交，未来提交不提前计入", () => {
  const member = base.members[0];
  const dueAt = deadline("2026-09-18");
  for (const [offset, expected] of [
    [0, "SUBMITTED"],
    [1, "LATE"],
    [3_600_000, "OVERDUE"],
  ] as const) {
    expect(
      dailySubmissionStatus(
        {
          ...base,
          reports: [
            {
              authorId: "a",
              reportDate: "2026-09-18",
              status: "SUBMITTED",
              dueAt,
              submittedAt: new Date(dueAt.getTime() + offset),
            },
          ],
        },
        member,
      ),
    ).toBe(expected);
  }
  expect(
    dailySubmissionStatus(
      {
        ...base,
        reports: [
          {
            authorId: "a",
            reportDate: "2026-09-18",
            status: "DRAFT",
            dueAt: deadline("2026-09-19"),
            submittedAt: null,
          },
        ],
      },
      member,
    ),
  ).toBe("PENDING");
});
it("成员分项与团队总量使用相同应交口径", () => {
  const data = {
    ...base,
    members: [
      ...base.members,
      { id: "b", createdAt: new Date("2026-09-17T00:00:00Z") },
    ],
    exemptions: [
      { userId: "a", startDate: "2026-09-18", endDate: "2026-09-18" },
    ],
  };
  const members = data.members.map((member) =>
    weeklySubmissionMetrics({ ...data, members: [member] }),
  );
  expect(members.reduce((sum, row) => sum + row.dueReports, 0)).toBe(
    weeklySubmissionMetrics(data).dueReports,
  );
  expect(members.map((row) => row.dueReports)).toEqual([4, 2]);
});
