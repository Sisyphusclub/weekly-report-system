import { expect, it, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), getDb: vi.fn() }));
vi.mock("@/lib/access", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/config", () => ({
  getConfig: () => ({ BETTER_AUTH_URL: "https://reports.example" }),
}));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
import { PATCH } from "../src/app/api/blockers/[id]/route";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.currentUser.mockResolvedValue({
    id: "coordinator",
    role: "EMPLOYEE",
    organizationId: "org",
    mustChangePassword: false,
  });
});
it.each(["OPEN", "RESOLVED"])(
  "协调人接收时遵循状态限制：%s",
  async (status) => {
    const update = vi.fn().mockReturnValue({
      set: () => ({
        where: () => ({
          returning: async () => [{ version: 2, status: "ACKNOWLEDGED" }],
        }),
      }),
    });
    const tx = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: "blocker",
                organizationId: "org",
                reporterId: "other",
                coordinatorId: "coordinator",
                isSensitive: true,
                version: 1,
                status,
              },
            ],
          }),
        }),
      }),
      update,
      insert: () => ({ values: async () => undefined }),
    };
    mocks.getDb.mockReturnValue({
      transaction: (fn: (value: typeof tx) => unknown) => fn(tx),
    });
    const response = await PATCH(
      new Request("https://reports.example/api/blockers/blocker", {
        method: "PATCH",
        headers: {
          origin: "https://reports.example",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "ACKNOWLEDGE",
          resolution: "",
          version: 1,
        }),
      }),
      { params: Promise.resolve({ id: "blocker" }) },
    );
    expect(response.status).toBe(status === "OPEN" ? 200 : 409);
    expect(update).toHaveBeenCalledTimes(status === "OPEN" ? 1 : 0);
  },
);
