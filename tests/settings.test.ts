import { beforeEach, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), getDb: vi.fn() }));
vi.mock("@/lib/access", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/config", () => ({
  getConfig: () => ({ BETTER_AUTH_URL: "https://weekly.example" }),
}));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
import { PATCH } from "../src/app/api/admin/settings/route";
import { auditLog, organization } from "../src/lib/db/schema";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.currentUser.mockResolvedValue({
    id: "admin",
    organizationId: "org",
    role: "ADMIN",
  });
});
function request(
  body: unknown = { name: "市场团队", version: 1, reason: "调整组织名称" },
) {
  return new Request("https://weekly.example/api/admin/settings", {
    method: "PATCH",
    headers: {
      origin: "https://weekly.example",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
function database({ conflict = false, failAudit = false } = {}) {
  const set = vi.fn();
  const where = vi.fn();
  const values = vi.fn(async () => {
    if (failAudit) throw new Error("audit unavailable");
  });
  const update = vi.fn(() => ({
    set: (data: unknown) => {
      set(data);
      return {
        where: (filter: SQL) => {
          where(new PgDialect().sqlToQuery(filter));
          return {
            returning: async () =>
              conflict ? [] : [{ name: "市场团队", version: 2 }],
          };
        },
      };
    },
  }));
  const insert = vi.fn(() => ({ values }));
  const tx = { update, insert };
  const transaction = vi.fn(
    async (run: (value: typeof tx) => Promise<unknown>) => run(tx),
  );
  mocks.getDb.mockReturnValue({ transaction });
  return { set, where, values, update, insert, transaction };
}
it.each(["EMPLOYEE", "BOSS"])(
  "rejects %s before touching settings",
  async (role) => {
    mocks.currentUser.mockResolvedValue({
      id: "member",
      organizationId: "org",
      role,
    });
    expect((await PATCH(request())).status).toBe(403);
    expect(mocks.getDb).not.toHaveBeenCalled();
  },
);
it.each([
  { name: " ", version: 1, reason: "reason" },
  { name: "x".repeat(81), version: 1, reason: "reason" },
  { name: "name", version: 0, reason: "reason" },
  { name: "name", version: 1, reason: "" },
  { name: "name", version: 1, reason: "reason", organizationId: "foreign" },
  { name: "name", version: 1, reason: "reason", timezone: "UTC" },
])("rejects invalid or unsupported settings %j", async (input) => {
  expect((await PATCH(request(input))).status).toBe(400);
  expect(mocks.getDb).not.toHaveBeenCalled();
});
it("updates only the actor organization and expected version, then writes audit in the transaction", async () => {
  const db = database();
  const response = await PATCH(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ name: "市场团队", version: 2 });
  expect(db.update).toHaveBeenCalledWith(organization);
  expect(db.set).toHaveBeenCalledWith({
    name: "市场团队",
    version: 2,
    updatedAt: expect.any(Date),
  });
  expect(db.where.mock.calls[0][0].params).toEqual(["org", 1]);
  expect(db.insert).toHaveBeenCalledWith(auditLog);
  expect(db.values).toHaveBeenCalledWith(
    expect.objectContaining({
      organizationId: "org",
      resourceId: "org",
      actorId: "admin",
      action: "ORGANIZATION_SETTINGS_UPDATE",
      reason: "调整组织名称",
    }),
  );
  expect(db.transaction).toHaveBeenCalledOnce();
});
it("rejects a stale version without recording success", async () => {
  const db = database({ conflict: true });
  expect((await PATCH(request())).status).toBe(409);
  expect(db.insert).not.toHaveBeenCalled();
});
it("propagates audit failure to the transaction and returns failure", async () => {
  const db = database({ failAudit: true });
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect((await PATCH(request())).status).toBe(500);
    await expect(db.transaction.mock.results[0].value).rejects.toThrow(
      "audit unavailable",
    );
  } finally {
    log.mockRestore();
  }
});
