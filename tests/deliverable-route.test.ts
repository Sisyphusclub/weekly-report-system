import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), getDb: vi.fn() }));
vi.mock("@/lib/access", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/config", () => ({
  getConfig: () => ({ BETTER_AUTH_URL: "https://reports.example" }),
}));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
import { POST } from "../src/app/api/tasks/deliverables/route";
import { deliverable, workTask } from "@/lib/db/schema";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.currentUser.mockResolvedValue({
    id: "author",
    organizationId: "org",
    role: "EMPLOYEE",
  });
});
function request() {
  return new Request("https://reports.example/api/tasks/deliverables", {
    method: "POST",
    headers: {
      origin: "https://reports.example",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      taskId: "task",
      unitId: "unit",
      version: 2,
      quantity: 3.5,
    }),
  });
}
function database(refs: unknown, existing = false) {
  const results = [refs ? [refs] : [], existing ? [{ id: "delivery" }] : []];
  const writes: Array<{ table: unknown; value: unknown }> = [];
  const tx = {
    select: () => {
      const result = Promise.resolve(results.shift() ?? []);
      const query = {
        from: () => query,
        innerJoin: () => query,
        where: () => query,
        limit: () => query,
        for: () => query,
        then: result.then.bind(result),
      };
      return query;
    },
    insert: (table: unknown) => ({
      values: async (value: unknown) => {
        writes.push({ table, value });
      },
    }),
    update: (table: unknown) => ({
      set: (value: unknown) => ({
        where: async () => {
          writes.push({ table, value });
        },
      }),
    }),
  };
  mocks.getDb.mockReturnValue({
    transaction: (fn: (value: typeof tx) => unknown) => fn(tx),
  });
  return writes;
}
it.each([
  [null, 404],
  [{ assignee: "other", version: 2 }, 403],
  [{ assignee: "author", version: 3 }, 409],
])("无效引用、越权和版本冲突不写交付物", async (refs, status) => {
  const writes = database(refs);
  expect((await POST(request())).status).toBe(status);
  expect(writes).toEqual([]);
});
it.each([true, false])(
  "保存数量并递增父任务版本，支持更新=%s",
  async (existing) => {
    const writes = database(
      { taskId: "task", assignee: "author", unitName: "份", version: 2 },
      existing,
    );
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ quantity: 3.5, version: 3 });
    expect(
      writes.find((entry) => entry.table === deliverable)?.value,
    ).toMatchObject({ quantity: "3.5", unitName: "份" });
    expect(
      writes.find((entry) => entry.table === workTask)?.value,
    ).toMatchObject({ version: 3 });
  },
);
