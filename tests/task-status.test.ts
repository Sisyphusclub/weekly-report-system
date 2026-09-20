import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), getDb: vi.fn() }));
vi.mock("@/lib/access", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/config", () => ({
  getConfig: () => ({ BETTER_AUTH_URL: "https://reports.example" }),
}));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
import { PATCH } from "../src/app/api/tasks/status/route";
const taskId = "00000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.currentUser.mockResolvedValue({
    id: "employee",
    organizationId: "org",
    role: "EMPLOYEE",
  });
});
function request(status = "DONE", version = 1) {
  return new Request("https://reports.example/api/tasks/status", {
    method: "PATCH",
    headers: {
      origin: "https://reports.example",
      "content-type": "application/json",
    },
    body: JSON.stringify({ taskId, status, version }),
  });
}
function database(task: unknown) {
  const set = vi.fn().mockReturnValue({
    where: () => ({
      returning: async () => [{ id: taskId, version: 2, status: "DONE" }],
    }),
  });
  const audit = vi.fn().mockResolvedValue(undefined);
  const inserts: unknown[] = [];
  const tx = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => ({ for: async () => (task ? [task] : []) }),
        }),
      }),
    }),
    update: () => ({ set }),
    insert: () => ({
      values: async (value: unknown) => {
        inserts.push(value);
        await audit(value);
      },
    }),
  };
  mocks.getDb.mockReturnValue({
    transaction: (fn: (value: typeof tx) => unknown) => fn(tx),
  });
  return { set, audit, inserts };
}
it.each([
  [null, 404],
  [{ id: taskId, primaryAssigneeId: "other", version: 1, status: "TODO" }, 403],
  [
    { id: taskId, primaryAssigneeId: "employee", version: 2, status: "TODO" },
    409,
  ],
])("任务不存在、越权或旧版本均不写入：%j", async (task, status) => {
  const { set, audit } = database(task);
  expect((await PATCH(request())).status).toBe(status);
  expect(set).not.toHaveBeenCalled();
  expect(audit).not.toHaveBeenCalled();
});
it("本人更新状态并记录前后状态，不改日期或来源", async () => {
  const { set, audit, inserts } = database({
    id: taskId,
    primaryAssigneeId: "employee",
    version: 1,
    status: "TODO",
  });
  const response = await PATCH(request());
  expect(response.status).toBe(200);
  expect(set).toHaveBeenCalledWith({
    status: "DONE",
    version: 2,
    updatedAt: expect.any(Date),
  });
  expect(audit).toHaveBeenCalledWith(
    expect.objectContaining({
      action: "TASK_STATUS_TODO_TO_DONE",
      actorId: "employee",
      resourceId: taskId,
    }),
  );
  expect(inserts).toContainEqual(
    expect.objectContaining({
      taskId,
      fromStatus: "TODO",
      toStatus: "DONE",
      changedById: "employee",
    }),
  );
});
it("相同状态不增加版本或重复审计", async () => {
  const { set, audit } = database({
    id: taskId,
    primaryAssigneeId: "employee",
    version: 1,
    status: "DONE",
  });
  const response = await PATCH(request());
  expect(await response.json()).toEqual({
    id: taskId,
    version: 1,
    status: "DONE",
  });
  expect(set).not.toHaveBeenCalled();
  expect(audit).not.toHaveBeenCalled();
});
it("管理员不能调用状态接口", async () => {
  mocks.currentUser.mockResolvedValue({
    id: "admin",
    role: "ADMIN",
  });
  expect((await PATCH(request())).status).toBe(403);
  expect(mocks.getDb).not.toHaveBeenCalled();
});
