import { expect, it } from "vitest";
import { dueReminders } from "@/lib/reminders";
const now = new Date("2026-09-18T19:00:00+08:00");
const member = {
  id: "u1",
  name: "小周",
  createdAt: new Date("2026-01-01T00:00:00Z"),
};
it("工作日 17:30 生成预提醒，18:30 切换为逾期提醒", () => {
  const dueAt = new Date("2026-09-18T10:30:00Z");
  const before = dueReminders({
    now: new Date("2026-09-18T09:29:59Z"),
    members: [member],
    bosses: ["boss"],
    reports: [
      {
        authorId: "u1",
        reportDate: "2026-09-18",
        status: "DRAFT",
        submittedAt: null,
        dueAt,
      },
    ],
  });
  expect(before).toEqual([]);
  const pre = dueReminders({
    now: new Date("2026-09-18T09:30:00Z"),
    members: [member],
    bosses: ["boss"],
    reports: [
      {
        authorId: "u1",
        reportDate: "2026-09-18",
        status: "DRAFT",
        submittedAt: null,
        dueAt,
      },
    ],
  });
  expect(pre).toEqual([
    expect.objectContaining({
      type: "DAILY_DUE",
      dedupeKey: "daily-reminder:u1:2026-09-18:due",
    }),
  ]);
  const late = dueReminders({
    now: new Date("2026-09-18T10:30:00Z"),
    members: [member],
    bosses: ["boss"],
    reports: [
      {
        authorId: "u1",
        reportDate: "2026-09-18",
        status: "DRAFT",
        submittedAt: null,
        dueAt,
      },
    ],
  });
  expect(late[0]).toMatchObject({
    type: "DAILY_OVERDUE",
    dedupeKey: "daily-reminder:u1:2026-09-18:overdue",
  });
});
it("生成本人逾期提醒和老板汇总提醒，并用键保证幂等", () => {
  const result = dueReminders({
    now,
    members: [member],
    bosses: ["boss"],
    reports: [],
  });
  expect(result).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        recipientId: "u1",
        type: "DAILY_OVERDUE",
        dedupeKey: "daily-reminder:u1:2026-09-18:overdue",
      }),
      expect.objectContaining({
        recipientId: "boss",
        dedupeKey: "daily-reminder:boss:boss:u1:2026-09-18",
      }),
    ]),
  );
  expect(new Set(result.map((item) => item.dedupeKey)).size).toBe(
    result.length,
  );
});
it("未来截止时间、周末和免报日期不提醒，已提交不提醒", () => {
  const result = dueReminders({
    now,
    members: [member],
    bosses: ["boss"],
    reports: [
      {
        authorId: "u1",
        reportDate: "2026-09-18",
        status: "SUBMITTED",
        submittedAt: now,
        dueAt: new Date("2026-09-18T10:30:00Z"),
      },
    ],
    exemptions: [
      { userId: "u1", startDate: "2026-09-17", endDate: "2026-09-19" },
    ],
  });
  expect(result).toEqual([]);
});
