import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), getDb: vi.fn() }));
vi.mock("@/lib/access", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/config", () => ({
  getConfig: () => ({ BETTER_AUTH_URL: "https://reports.example" }),
}));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
import { POST } from "../src/app/api/admin/tasks/transfer/route";
import { auditLog, notification, workTask } from "../src/lib/db/schema";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.currentUser.mockResolvedValue({
    id: "admin",
    organizationId: "org",
    role: "ADMIN",
    mustChangePassword: false,
    twoFactorEnabled: true,
  });
});
const payload = {
  fromId: "source",
  toId: "target",
  expectedCount: 2,
  reason: "人员交接",
};
function request(value = payload) {
  return new Request("https://reports.example/api/admin/tasks/transfer", {
    method: "POST",
    headers: {
      origin: "https://reports.example",
      "content-type": "application/json",
    },
    body: JSON.stringify(value),
  });
}
function database(
  options: {
    count?: number;
    targetStatus?: string;
    targetRole?: string;
    targetMissing?: boolean;
    failAudit?: boolean;
  } = {},
) {
  const people = [
    { id: "source", status: "DISABLED", role: "EMPLOYEE" },
    ...(options.targetMissing
      ? []
      : [
          {
            id: "target",
            status: options.targetStatus ?? "ACTIVE",
            role: options.targetRole ?? "EMPLOYEE",
          },
        ]),
  ];
  const tasks = Array.from({ length: options.count ?? 2 }, (_, i) => ({
    id: `task-${i}`,
  }));
  const selections: unknown[][] = [people, tasks];
  const mutations: Array<{ table: unknown; value: unknown }> = [];
  const tx = {
    select: () => {
      const rows = selections.shift();
      const query = {
        from: () => query,
        where: () => query,
        orderBy: () => query,
        limit: () => query,
        for: async () => rows,
      };
      return query;
    },
    update: (table: unknown) => ({
      set: (value: unknown) => ({
        where: async () => mutations.push({ table, value }),
      }),
    }),
    insert: (table: unknown) => ({
      values: async (value: unknown) => {
        if (table === auditLog && options.failAudit)
          throw new Error("audit failed");
        mutations.push({ table, value });
      },
    }),
  };
  const transaction = vi.fn(
    (action: (transaction: typeof tx) => Promise<unknown>) => action(tx),
  );
  mocks.getDb.mockReturnValue({ transaction });
  return { mutations, transaction };
}
it.each(["EMPLOYEE", "BOSS"])(
  "denies %s before opening a transaction",
  async (role) => {
    mocks.currentUser.mockResolvedValue({
      id: role,
      organizationId: "org",
      role,
      twoFactorEnabled: true,
    });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.getDb).not.toHaveBeenCalled();
  },
);
it("rejects a self-transfer", async () => {
  expect((await POST(request({ ...payload, toId: "source" }))).status).toBe(
    400,
  );
  expect(mocks.getDb).not.toHaveBeenCalled();
});
it.each([
  { targetMissing: true },
  { targetStatus: "DISABLED" },
  { targetStatus: "PENDING" },
  { targetRole: "ADMIN" },
])("rejects unavailable receivers %j", async (options) => {
  const db = database(options);
  expect((await POST(request())).status).toBe(409);
  expect(db.mutations).toEqual([]);
});
it("rejects changed batch size without writes", async () => {
  const db = database({ count: 1 });
  expect((await POST(request())).status).toBe(409);
  expect(db.mutations).toEqual([]);
});
it("transfers from a disabled account and records every task and receiver notification", async () => {
  const db = database();
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ transferred: 2 });
  expect(db.transaction).toHaveBeenCalledOnce();
  expect(db.mutations.map((entry) => entry.table)).toEqual([
    workTask,
    auditLog,
    notification,
  ]);
  expect(db.mutations[0].value).toMatchObject({ primaryAssigneeId: "target" });
  expect(db.mutations[1].value).toEqual(
    ["task-0", "task-1"].map((id) =>
      expect.objectContaining({
        actorId: "admin",
        resourceId: id,
        action: "TASK_TRANSFER",
        reason: JSON.stringify({
          fromId: "source",
          toId: "target",
          reason: "人员交接",
        }),
      }),
    ),
  );
  expect(db.mutations[2].value).toMatchObject({
    recipientId: "target",
    type: "TASK_TRANSFER",
    link: "/tasks",
  });
});
it("propagates audit failure out of the transaction and does not send a notification", async () => {
  const db = database({ failAudit: true });
  const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
  try {
    expect((await POST(request())).status).toBe(500);
    expect(db.mutations.some((entry) => entry.table === notification)).toBe(
      false,
    );
  } finally {
    log.mockRestore();
  }
});
