import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  getDb: vi.fn(),
}));
vi.mock("@/lib/access", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/config", () => ({
  getConfig: () => ({ BETTER_AUTH_URL: "https://reports.example" }),
}));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
import { POST, GET } from "../src/app/api/tasks/route";

const payload = {
  id: "00000000-0000-4000-8000-000000000001",
  version: 1,
  projectId: "project",
  categoryId: "category",
  primaryAssigneeId: "employee",
  content: "整理活动素材",
  kind: "ACTUAL",
  status: "TODO",
  workDate: "2026-09-18",
  dueDate: null,
};
function request(body: unknown) {
  return new Request("https://reports.example/api/tasks", {
    method: "POST",
    headers: {
      origin: "https://reports.example",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.currentUser.mockResolvedValue({
    id: "employee",
    organizationId: "org",
    role: "EMPLOYEE",
    mustChangePassword: false,
    twoFactorEnabled: false,
  });
});

it.each([
  "limit=NaN",
  "limit=1.5",
  "limit=101",
  "offset=-1",
  "offset=Infinity",
])("非法分页参数拒绝进入数据库：%s", async (query) => {
  const response = await GET(
    new Request(`https://reports.example/api/tasks?${query}`),
  );
  expect(response.status).toBe(400);
  expect(mocks.getDb).not.toHaveBeenCalled();
});

it("普通同源 GET 无 Origin 头也可读取任务", async () => {
  const offset = vi.fn().mockResolvedValue([]);
  mocks.getDb.mockReturnValue({
    select: () => ({
      from: () => ({
        where: () => ({ orderBy: () => ({ limit: () => ({ offset }) }) }),
      }),
    }),
  });
  const response = await GET(new Request("https://reports.example/api/tasks"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ items: [], limit: 50, offset: 0 });
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});

it("认证服务异常返回服务错误，不伪装成未登录", async () => {
  mocks.currentUser.mockRejectedValue(new Error("private details"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const response = await GET(
      new Request("https://reports.example/api/tasks"),
    );
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private details");
  } finally {
    log.mockRestore();
  }
});

it("员工不能通过把负责人改为自己来修改他人任务", async () => {
  const update = vi.fn();
  const lock = vi
    .fn()
    .mockResolvedValue([{ primaryAssigneeId: "other", version: 1 }]);
  const tx = {
    select: () => ({
      from: () => ({ where: () => ({ limit: () => ({ for: lock }) }) }),
    }),
    update,
  };
  mocks.getDb.mockReturnValue({
    transaction: (fn: (value: typeof tx) => unknown) => fn(tx),
  });
  const response = await POST(request(payload));
  expect(response.status).toBe(403);
  expect(lock).toHaveBeenCalledWith("update");
  expect(update).not.toHaveBeenCalled();
});

it("员工不能通过创建接口向他人分配任务", async () => {
  const response = await POST(
    request({
      ...payload,
      id: undefined,
      version: 0,
      primaryAssigneeId: "other",
    }),
  );
  expect(response.status).toBe(403);
  expect(mocks.getDb).not.toHaveBeenCalled();
});

it("管理员不能调用业务任务写入接口", async () => {
  mocks.currentUser.mockResolvedValue({
    id: "admin",
    organizationId: "org",
    role: "ADMIN",
    mustChangePassword: false,
    twoFactorEnabled: true,
  });
  const response = await POST(request(payload));
  expect(response.status).toBe(403);
  expect(mocks.getDb).not.toHaveBeenCalled();
});

it("普通创建接口不能绕过计划滚动规则", async () => {
  const response = await POST(
    request({
      ...payload,
      id: undefined,
      version: 0,
      kind: "PLAN",
      dueDate: "2026-09-20",
      sourceTaskId: payload.id,
    }),
  );
  expect(response.status).toBe(400);
  expect(mocks.getDb).not.toHaveBeenCalled();
});

it.each([
  { sourceTaskId: payload.id },
  { kind: "ACTUAL", dueDate: null },
  { dueDate: "2026-09-25" },
])("不能通过编辑清洗原计划事实：%j", async (changes) => {
  const update = vi.fn();
  const tx = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => ({
            for: async () => [
              {
                primaryAssigneeId: "employee",
                version: 1,
                kind: "PLAN",
                dueDate: "2026-09-18",
                sourceTaskId: null,
              },
            ],
          }),
        }),
      }),
    }),
    update,
  };
  mocks.getDb.mockReturnValue({
    transaction: (fn: (value: typeof tx) => unknown) => fn(tx),
  });
  const response = await POST(
    request({ ...payload, kind: "PLAN", dueDate: "2026-09-18", ...changes }),
  );
  expect(response.status).toBe(400);
  expect(update).not.toHaveBeenCalled();
});
