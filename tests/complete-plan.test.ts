import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), getDb: vi.fn() }));

vi.mock("@/lib/access", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/config", () => ({
  getConfig: () => ({ BETTER_AUTH_URL: "https://reports.example" }),
}));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));

import { POST } from "../src/app/api/tasks/complete-plan/route";

const taskId = "00000000-0000-4000-8000-000000000001";
const source = {
  id: taskId,
  organizationId: "org",
  primaryAssigneeId: "employee",
  projectId: "project",
  categoryId: "category",
  categoryName: "内容运营",
  content: "完成活动复盘",
  kind: "PLAN",
  status: "IN_PROGRESS",
  version: 1,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.currentUser.mockResolvedValue({
    id: "employee",
    organizationId: "org",
    role: "EMPLOYEE",
  });
});

function request(version = 1) {
  return new Request("https://reports.example/api/tasks/complete-plan", {
    method: "POST",
    headers: {
      origin: "https://reports.example",
      "content-type": "application/json",
    },
    body: JSON.stringify({ taskId, version }),
  });
}

function database({
  task = source,
  existing = null,
  deliveries = [{ unitId: "unit", unitName: "份", quantity: "1" }],
}: {
  task?: unknown;
  existing?: unknown;
  deliveries?: unknown[];
} = {}) {
  const writes: unknown[] = [];
  const set = vi.fn().mockReturnValue({
    where: () => ({ returning: async () => [{ version: 2 }] }),
  });
  let reads = 0;
  const tx = {
    select: () => {
      reads += 1;
      if (reads === 1)
        return {
          from: () => ({
            where: () => ({
              limit: () => ({ for: async () => (task ? [task] : []) }),
            }),
          }),
        };
      if (reads === 2)
        return {
          from: () => ({
            where: () => ({
              limit: async () => (existing ? [existing] : []),
            }),
          }),
        };
      return {
        from: () => ({ where: async () => deliveries }),
      };
    },
    insert: () => ({
      values: async (value: unknown) => {
        writes.push(value);
      },
    }),
    update: () => ({ set }),
  };
  mocks.getDb.mockReturnValue({
    transaction: (fn: (value: typeof tx) => unknown) => fn(tx),
  });
  return { writes, set };
}

it.each([
  [null, 404],
  [{ ...source, primaryAssigneeId: "other" }, 403],
  [{ ...source, kind: "ACTUAL" }, 400],
  [{ ...source, version: 2 }, 409],
  [{ ...source, status: "CANCELED" }, 400],
])("拒绝无效计划且不产生写入：%j", async (task, status) => {
  const { writes, set } = database({ task });
  expect((await POST(request())).status).toBe(status);
  expect(writes).toHaveLength(0);
  expect(set).not.toHaveBeenCalled();
});

it("在同一事务生成实际任务、复制产出并核销计划", async () => {
  const { writes, set } = database();
  const response = await POST(request());
  const result = await response.json();

  expect(response.status).toBe(200);
  expect(result).toEqual({
    id: expect.any(String),
    version: 1,
    workDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
  });
  expect(writes).toContainEqual(
    expect.objectContaining({
      id: result.id,
      sourceTaskId: taskId,
      kind: "ACTUAL",
      status: "DONE",
      content: source.content,
    }),
  );
  expect(writes).toContainEqual([
    expect.objectContaining({
      taskId: result.id,
      unitName: "份",
      quantity: "1",
    }),
  ]);
  expect(set).toHaveBeenCalledWith({
    status: "DONE",
    version: 2,
    updatedAt: expect.any(Date),
  });
  expect(writes).toContainEqual(
    expect.objectContaining({
      action: "PLAN_COMPLETE_TO_ACTUAL",
      resourceId: taskId,
    }),
  );
});

it("重复请求返回已有实际任务，不重复写入", async () => {
  const existing = {
    id: "actual",
    version: 1,
    workDate: "2026-09-20",
  };
  const { writes, set } = database({
    task: { ...source, version: 2, status: "DONE" },
    existing,
  });
  const response = await POST(request());

  expect(await response.json()).toEqual(existing);
  expect(writes).toHaveLength(0);
  expect(set).not.toHaveBeenCalled();
});

it("管理员不能核销业务计划", async () => {
  mocks.currentUser.mockResolvedValue({
    id: "admin",
    organizationId: "org",
    role: "ADMIN",
  });
  expect((await POST(request())).status).toBe(403);
  expect(mocks.getDb).not.toHaveBeenCalled();
});
