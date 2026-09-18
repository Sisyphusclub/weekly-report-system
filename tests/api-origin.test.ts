import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ currentUser: vi.fn() }));
vi.mock("@/lib/access", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/config", () => ({
  getConfig: () => ({ BETTER_AUTH_URL: "https://weekly.example" }),
}));
import { writeActor } from "../src/lib/api";

const actor = {
  id: "member",
  organizationId: "org",
  role: "BOSS",
  mustChangePassword: false,
  twoFactorEnabled: true,
};
beforeEach(() => {
  mocks.currentUser.mockReset().mockResolvedValue(actor);
});
function request(method: string, headers: Record<string, string> = {}) {
  return new Request("https://weekly.example/api/tasks/export", {
    method,
    headers,
  });
}
it.each(["GET", "HEAD"])(
  "allows %s without Origin while checking session",
  async (method) => {
    const cases: Record<string, string>[] = [
      {},
      { "sec-fetch-site": "same-origin" },
      { "sec-fetch-site": "none" },
    ];
    for (const headers of cases) {
      await expect(writeActor(request(method, headers))).resolves.toEqual(
        actor,
      );
    }
    expect(mocks.currentUser).toHaveBeenCalledTimes(3);
  },
);
it.each(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"])(
  "rejects foreign or opaque Origin on %s before authentication",
  async (method) => {
    for (const origin of ["https://evil.example", "null", ""]) {
      await expect(
        writeActor(request(method, { origin })),
      ).rejects.toMatchObject({ status: 403 });
    }
    expect(mocks.currentUser).not.toHaveBeenCalled();
  },
);
it.each(["POST", "PUT", "PATCH", "DELETE"])(
  "requires Origin for %s even with same-origin metadata",
  async (method) => {
    await expect(
      writeActor(request(method, { "sec-fetch-site": "same-origin" })),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      writeActor(request(method, { origin: "https://weekly.example" })),
    ).resolves.toEqual(actor);
  },
);
it.each(["cross-site", "same-site", "unknown"])(
  "rejects %s reads",
  async (site) => {
    await expect(
      writeActor(request("GET", { "sec-fetch-site": site })),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.currentUser).not.toHaveBeenCalled();
  },
);
it("requires authentication for same-origin reads", async () => {
  mocks.currentUser.mockResolvedValue(null);
  await expect(writeActor(request("GET"))).rejects.toMatchObject({
    status: 401,
  });
});
it.each([
  { ...actor, mustChangePassword: true },
  { ...actor, twoFactorEnabled: false },
])("requires account security setup for reads", async (user) => {
  mocks.currentUser.mockResolvedValue(user);
  await expect(writeActor(request("GET"))).rejects.toMatchObject({
    status: 403,
  });
});
