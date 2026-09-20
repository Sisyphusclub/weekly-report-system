import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), getDb: vi.fn() }));
vi.mock("@/lib/access", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/config", () => ({
  getConfig: () => ({ BETTER_AUTH_URL: "https://reports.example" }),
}));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
import { POST } from "../src/app/api/tasks/roll/route";
const source = {
  id: "00000000-0000-4000-8000-000000000001",
  primaryAssigneeId: "employee",
  organizationId: "org",
  version: 1,
  kind: "PLAN",
  status: "TODO",
  dueDate: "2026-09-18",
  content: "活动计划",
  projectId: "p",
  categoryId: "c",
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.currentUser.mockResolvedValue({
    id: "employee",
    organizationId: "org",
    role: "EMPLOYEE",
  });
});
function request(dueDate = "2026-09-25") {
  return new Request("https://reports.example/api/tasks/roll", {
    method: "POST",
    headers: {
      origin: "https://reports.example",
      "content-type": "application/json",
    },
    body: JSON.stringify({ taskId: source.id, version: 1, dueDate }),
  });
}
function database(task: unknown, existing: unknown = null) {
  const writes = vi.fn().mockResolvedValue(undefined);
  let reads = 0;
  const query = {
    from: () => query,
    where: () => query,
    innerJoin: () => query,
    limit: () => {
      reads++;
      if (reads === 1) return { for: async () => (task ? [task] : []) };
      return Promise.resolve(
        reads === 2 ? (existing ? [existing] : []) : [{ id: "p" }],
      );
    },
  };
  const tx = { select: () => query, insert: () => ({ values: writes }) };
  mocks.getDb.mockReturnValue({
    transaction: (fn: (value: typeof tx) => unknown) => fn(tx),
  });
  return writes;
}
it.each([
  [null, 404],
  [{ ...source, primaryAssigneeId: "other" }, 403],
  [{ ...source, version: 2 }, 409],
  [{ ...source, kind: "ACTUAL" }, 400],
  [{ ...source, status: "DONE" }, 400],
  [{ ...source, status: "CANCELED" }, 400],
])("无效来源和旧版本不会写入：%j", async (task, status) => {
  const writes = database(task);
  expect((await POST(request())).status).toBe(status);
  expect(writes).not.toHaveBeenCalled();
});
it("滚动新建任务和审计，保持来源对象不变", async () => {
  const original = { ...source };
  const writes = database(original);
  const response = await POST(request());
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.id).not.toBe(source.id);
  expect(writes).toHaveBeenCalledWith(
    expect.objectContaining({
      id: result.id,
      sourceTaskId: source.id,
      dueDate: "2026-09-25",
      version: 1,
      status: "TODO",
    }),
  );
  expect(writes).toHaveBeenCalledWith(
    expect.objectContaining({ action: "PLAN_ROLL", resourceId: result.id }),
  );
  expect(original).toEqual(source);
});
it("重复请求返回已有后续计划，不重复创建或审计", async () => {
  const writes = database(source, { id: "existing", version: 1 });
  const response = await POST(request());
  expect(await response.json()).toEqual({ id: "existing", version: 1 });
  expect(writes).not.toHaveBeenCalled();
});
