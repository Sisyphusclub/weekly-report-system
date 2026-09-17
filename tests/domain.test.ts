import { describe, it, expect } from "vitest";
import {
  canReadReport,
  weekDates,
  deadline,
  validateSubmission,
  summarizeDeliverables,
  weeklyDeadline,
  missingDailyReports,
  canReadBlocker,
  revisionDecision,
  rollPlan,
} from "@/lib/domain";
describe("report authorization", () => {
  const report = {
    authorId: "one",
    organizationId: "org",
    status: "DRAFT" as const,
  };
  it("denies other drafts to boss and admin", () => {
    for (const role of ["BOSS", "ADMIN", "EMPLOYEE"] as const)
      expect(
        canReadReport({ id: "two", organizationId: "org", role }, report),
      ).toBe(false);
  });
  it("denies cross organization reads even for author", () =>
    expect(
      canReadReport(
        { id: "one", organizationId: "other", role: "BOSS" },
        report,
      ),
    ).toBe(false));
  it("allows team submissions but not technical administrators", () => {
    expect(
      canReadReport(
        { id: "two", organizationId: "org", role: "EMPLOYEE" },
        { ...report, status: "SUBMITTED" },
      ),
    ).toBe(true);
    expect(
      canReadReport(
        { id: "two", organizationId: "org", role: "ADMIN" },
        { ...report, status: "SUBMITTED" },
      ),
    ).toBe(false);
  });
  it("allows an administrator to read their own submitted report", () =>
    expect(
      canReadReport(
        { id: "one", organizationId: "org", role: "ADMIN" },
        { ...report, status: "SUBMITTED" },
      ),
    ).toBe(true));
});
describe("calendar and reporting", () => {
  it("finds natural week across year boundaries", () =>
    expect(weekDates("2027-01-01")).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]));
  it("uses Shanghai deadline", () =>
    expect(deadline("2026-09-17").toISOString()).toBe(
      "2026-09-17T10:30:00.000Z",
    ));
  it("rejects silent empty reports", () =>
    expect(() =>
      validateSubmission({ tasks: [], noWorkReason: "", noPlanReason: "" }),
    ).toThrow());
  it("accepts explicit zero work reasons", () =>
    expect(() =>
      validateSubmission({
        tasks: [],
        noWorkReason: "请假",
        noPlanReason: "免报",
      }),
    ).not.toThrow());
  it("deduplicates task references and keeps units separate", () => {
    const task = {
      id: "a",
      deliverables: [
        { unitId: "video", quantity: 1 },
        { unitId: "poster", quantity: 2 },
      ],
    };
    expect(summarizeDeliverables([task, task])).toEqual({
      video: 1,
      poster: 2,
    });
  });
  it.each(["2026-02-30", "2026-13-01", "invalid", "2026-9-1"])(
    "rejects invalid date %s",
    (date) => expect(() => weekDates(date)).toThrow(),
  );
  it("requires a separate reason for missing plans", () =>
    expect(() =>
      validateSubmission({ tasks: [{ id: "a" }], noPlanReason: "" }),
    ).toThrow());
  it("requires a separate reason for missing actual work", () =>
    expect(() =>
      validateSubmission({ tasks: [], noPlanReason: "休假" }),
    ).toThrow());
  it("accepts work with an explicit no-plan reason", () =>
    expect(() =>
      validateSubmission({ tasks: [{ id: "a" }], noPlanReason: "明日休假" }),
    ).not.toThrow());
  it("moves weekly deadline to a working Sunday", () =>
    expect(
      weeklyDeadline("2026-09-17", { "2026-09-20": true })?.toISOString(),
    ).toBe("2026-09-20T10:30:00.000Z"));
  it("has no deadline for a fully exempt week", () =>
    expect(
      weeklyDeadline(
        "2026-09-17",
        Object.fromEntries(
          weekDates("2026-09-17").map((date) => [date, false]),
        ),
      ),
    ).toBeNull());
  it("requires all non-exempt daily reports", () =>
    expect(
      missingDailyReports("2026-09-17", ["2026-09-14"], ["2026-09-15"], {}),
    ).toEqual(["2026-09-16", "2026-09-17", "2026-09-18"]));
  it("rejects negative deliverables", () =>
    expect(() =>
      summarizeDeliverables([
        { id: "a", deliverables: [{ unitId: "x", quantity: -1 }] },
      ]),
    ).toThrow());
  it("does not inherit Object prototype values as totals", () =>
    expect(
      summarizeDeliverables([
        { id: "a", deliverables: [{ unitId: "constructor", quantity: 1 }] },
      ]),
    ).toEqual({ constructor: 1 }));
});

describe("sensitive blockers and immutable history", () => {
  const blocker = {
    organizationId: "org",
    reporterId: "one",
    coordinatorId: "two",
    isSensitive: true,
  };
  it("denies sensitive blockers to uninvolved employees and administrators", () => {
    for (const role of ["EMPLOYEE", "ADMIN"] as const)
      expect(
        canReadBlocker({ id: "three", organizationId: "org", role }, blocker),
      ).toBe(false);
  });
  it("allows coordinator and boss", () => {
    expect(
      canReadBlocker(
        { id: "two", organizationId: "org", role: "EMPLOYEE" },
        blocker,
      ),
    ).toBe(true);
    expect(
      canReadBlocker(
        { id: "three", organizationId: "org", role: "BOSS" },
        blocker,
      ),
    ).toBe(true);
  });
  it("never allows a different organization", () =>
    expect(
      canReadBlocker(
        { id: "one", organizationId: "other", role: "BOSS" },
        blocker,
      ),
    ).toBe(false));
  it("requires approval only after seven elapsed days", () => {
    expect(
      revisionDecision(
        new Date("2026-09-01T10:30:00Z"),
        new Date("2026-09-08T10:30:00Z"),
      ),
    ).toBe("DIRECT");
    expect(
      revisionDecision(
        new Date("2026-09-01T10:30:00Z"),
        new Date("2026-09-08T10:30:00.001Z"),
      ),
    ).toBe("APPROVAL_REQUIRED");
  });
  it("rolls a plan without changing the original due date", () => {
    const original = {
      id: "a",
      dueDate: "2026-09-17",
      content: "发布内容",
      status: "IN_PROGRESS" as const,
    };
    const next = rollPlan(original, "b", "2026-09-18");
    expect(next).toMatchObject({
      id: "b",
      sourceTaskId: "a",
      dueDate: "2026-09-18",
      status: "TODO",
    });
    expect(original.dueDate).toBe("2026-09-17");
  });
  it("does not roll completed plans", () =>
    expect(() =>
      rollPlan(
        { id: "a", dueDate: "2026-09-17", content: "完成", status: "DONE" },
        "b",
        "2026-09-18",
      ),
    ).toThrow());
});
