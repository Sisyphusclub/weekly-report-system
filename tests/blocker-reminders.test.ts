import { expect, it } from "vitest";
import { overdueBlockerReminders } from "@/lib/blocker-reminders";
const now = new Date("2026-09-20T12:00:00Z");
it("重要阻塞超过 24 小时提醒协调人，未分配时提醒老板", () => {
  const result = overdueBlockerReminders({
    now,
    bosses: ["boss"],
    blockers: [
      {
        id: "a",
        severity: "IMPORTANT",
        status: "OPEN",
        createdAt: new Date("2026-09-18T00:00:00Z"),
        coordinatorId: "coordinator",
      },
      {
        id: "b",
        severity: "IMPORTANT",
        status: "ACKNOWLEDGED",
        createdAt: new Date("2026-09-18T00:00:00Z"),
        coordinatorId: null,
      },
    ],
  });
  expect(result.map((item) => item.recipientId)).toEqual([
    "coordinator",
    "boss",
  ]);
});
it("普通、未满 24 小时和已解决阻塞不提醒", () => {
  expect(
    overdueBlockerReminders({
      now,
      bosses: ["boss"],
      blockers: [
        {
          id: "a",
          severity: "NORMAL",
          status: "OPEN",
          createdAt: new Date("2026-09-18T00:00:00Z"),
          coordinatorId: null,
        },
        {
          id: "b",
          severity: "IMPORTANT",
          status: "OPEN",
          createdAt: new Date("2026-09-19T13:00:00Z"),
          coordinatorId: null,
        },
        {
          id: "c",
          severity: "IMPORTANT",
          status: "RESOLVED",
          createdAt: new Date("2026-09-18T00:00:00Z"),
          coordinatorId: null,
        },
      ],
    }),
  ).toEqual([]);
});
