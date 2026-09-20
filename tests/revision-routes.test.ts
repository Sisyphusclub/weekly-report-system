import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), getDb: vi.fn() }));
vi.mock("@/lib/access", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/config", () => ({
  getConfig: () => ({ BETTER_AUTH_URL: "https://reports.example" }),
}));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
import { POST as revise } from "../src/app/api/reports/revisions/route";
import { POST as review } from "../src/app/api/reports/revisions/review/route";
import {
  notification,
  report,
  reportRevision,
  revisionRequest,
} from "@/lib/db/schema";

const id = "00000000-0000-4000-8000-000000000001";
const applicationId = "00000000-0000-4000-8000-000000000002";
const actor = {
  id: "author",
  organizationId: "org",
  role: "EMPLOYEE",
};
function item(overrides = {}) {
  return {
    id,
    authorId: "author",
    status: "SUBMITTED",
    version: 3,
    revisionNumber: 1,
    summary: "原总结",
    submittedAt: new Date(),
    ...overrides,
  };
}
function application(overrides = {}) {
  return {
    id: applicationId,
    reportId: id,
    requesterId: "author",
    baseVersion: 3,
    version: 1,
    status: "PENDING",
    reason: "更正表述",
    proposedChanges: { summary: "新总结" },
    ...overrides,
  };
}
function request(body: object) {
  return new Request("https://reports.example/api/reports/revisions", {
    method: "POST",
    headers: {
      origin: "https://reports.example",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
function database(results: unknown[][]) {
  const inserts: Array<{ table: unknown; value: unknown }> = [];
  const updates: Array<{ table: unknown; value: unknown }> = [];
  const tx = {
    select: () => {
      const result = Promise.resolve(results.shift() ?? []);
      const query = {
        from: () => query,
        where: () => query,
        limit: () => query,
        for: () => query,
        then: result.then.bind(result),
      };
      return query;
    },
    insert: (table: unknown) => ({
      values: (value: unknown) => {
        inserts.push({ table, value });
        return { onConflictDoNothing: async () => undefined };
      },
    }),
    update: (table: unknown) => ({
      set: (value: unknown) => {
        updates.push({ table, value });
        return { where: async () => undefined };
      },
    }),
  };
  mocks.getDb.mockReturnValue({
    transaction: (fn: (value: typeof tx) => unknown) => fn(tx),
  });
  return { inserts, updates };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.currentUser.mockResolvedValue(actor);
});
const revisionBody = {
  reportId: id,
  version: 3,
  summary: "新总结",
  reason: "更正表述",
};
const reviewBody = {
  requestId: applicationId,
  version: 1,
  decision: "APPROVED",
  reason: "核对通过",
};

it.each([
  [item({ authorId: "other" }), 404],
  [item({ version: 4 }), 409],
  [item({ status: "DRAFT" }), 400],
])("越权、旧版本和草稿不能修订 %j", async (row, status) => {
  const db = database([[row]]);
  expect((await revise(request(revisionBody))).status).toBe(status);
  expect(db.inserts).toHaveLength(0);
  expect(db.updates).toHaveLength(0);
});
it("七天内修订追加快照，保留任务与来源，不重写提交时间", async () => {
  const snapshot = {
    summary: "原总结",
    tasks: [{ id: "task" }],
    sourceReports: [{ id: "daily", version: 1 }],
  };
  const db = database([[item()], [{ snapshot }]]);
  expect((await revise(request(revisionBody))).status).toBe(200);
  expect(
    db.inserts.find((entry) => entry.table === reportRevision)?.value,
  ).toMatchObject({
    snapshot: { ...snapshot, summary: "新总结", version: 4, revisionNumber: 2 },
    diff: { summary: ["原总结", "新总结"] },
  });
  expect(db.updates[0].value).not.toHaveProperty("submittedAt");
  expect(db.updates[0].value).not.toHaveProperty("wasLate");
});
it("超期申请只写申请、审计及通知，不更改报告", async () => {
  const db = database([
    [item({ submittedAt: new Date(Date.now() - 8 * 86400000) })],
    [],
    [{ id: "boss" }],
  ]);
  const response = await revise(request(revisionBody));
  expect((await response.json()).status).toBe("PENDING");
  expect(db.updates).toHaveLength(0);
  expect(db.inserts.some((entry) => entry.table === revisionRequest)).toBe(
    true,
  );
  expect(db.inserts.some((entry) => entry.table === reportRevision)).toBe(
    false,
  );
  expect(
    db.inserts.find((entry) => entry.table === notification)?.value,
  ).toEqual([
    expect.objectContaining({
      recipientId: "boss",
      title: "有报告修订申请待审核",
      link: `/reports/${id}`,
    }),
  ]);
});
it("同一申请人已有待审核申请时不重复创建", async () => {
  const db = database([
    [item({ submittedAt: new Date(Date.now() - 8 * 86400000) })],
    [{ id: applicationId }],
  ]);
  expect((await revise(request(revisionBody))).status).toBe(409);
  expect(db.inserts).toHaveLength(0);
});
it.each(["EMPLOYEE", "ADMIN"])("%s 无权审核", async (role) => {
  mocks.currentUser.mockResolvedValue({ ...actor, role });
  expect((await review(request(reviewBody))).status).toBe(403);
  expect(mocks.getDb).not.toHaveBeenCalled();
});
it.each([
  [item({ version: 4 }), application()],
  [item(), application({ status: "APPROVED" })],
  [item(), application({ version: 2 })],
])("报告已变更或申请已处理时不写入", async (row, pending) => {
  mocks.currentUser.mockResolvedValue({ ...actor, id: "boss", role: "BOSS" });
  const db = database([[{ reportId: id }], [row], [pending]]);
  expect((await review(request(reviewBody))).status).toBe(409);
  expect(db.inserts).toHaveLength(0);
  expect(db.updates).toHaveLength(0);
});
it("批准生成新版本并通知申请人", async () => {
  mocks.currentUser.mockResolvedValue({ ...actor, id: "boss", role: "BOSS" });
  const snapshot = {
    tasks: [{ id: "task" }],
    sourceReports: [{ id: "daily", version: 1 }],
  };
  const db = database([
    [{ reportId: id }],
    [item()],
    [application()],
    [{ snapshot }],
  ]);
  expect((await review(request(reviewBody))).status).toBe(200);
  expect(
    db.inserts.find((entry) => entry.table === reportRevision)?.value,
  ).toMatchObject({
    editorId: "author",
    snapshot: { ...snapshot, summary: "新总结", version: 4 },
    diff: { approval: { reviewerId: "boss" } },
  });
  expect(
    db.updates.find((entry) => entry.table === report)?.value,
  ).toMatchObject({ version: 4 });
  expect(
    db.inserts.find((entry) => entry.table === notification)?.value,
  ).toMatchObject({
    recipientId: "author",
    dedupeKey: `revision-reviewed:${applicationId}`,
  });
});
it("拒绝旧申请不修改报告，记录审核原因", async () => {
  mocks.currentUser.mockResolvedValue({ ...actor, id: "boss", role: "BOSS" });
  const db = database([
    [{ reportId: id }],
    [item({ version: 4 })],
    [application()],
  ]);
  expect(
    (
      await review(
        request({
          ...reviewBody,
          decision: "REJECTED",
          reason: "请按新版本重提",
        }),
      )
    ).status,
  ).toBe(200);
  expect(db.updates).toEqual([
    {
      table: revisionRequest,
      value: expect.objectContaining({
        status: "REJECTED",
        reviewReason: "请按新版本重提",
      }),
    },
  ]);
  expect(db.inserts.some((entry) => entry.table === reportRevision)).toBe(
    false,
  );
});
