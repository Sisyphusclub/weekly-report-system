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
import { POST } from "../src/app/api/tasks/route";

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
