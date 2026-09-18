import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  getDb: vi.fn(),
  verifyObject: vi.fn(),
  scanObject: vi.fn(),
  deleteObject: vi.fn(),
}));
vi.mock("@/lib/access", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/config", () => ({
  getConfig: () => ({ BETTER_AUTH_URL: "https://reports.example" }),
}));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/storage", () => ({
  verifyObject: mocks.verifyObject,
  scanObject: mocks.scanObject,
  deleteObject: mocks.deleteObject,
}));
import { PATCH } from "../src/app/api/tasks/attachments/route";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.currentUser.mockResolvedValue({
    id: "employee",
    organizationId: "org",
    role: "EMPLOYEE",
    mustChangePassword: false,
  });
});
function database(verifiedAt: Date | null, assignee = "employee") {
  const query = {
    from: () => query,
    innerJoin: () => query,
    where: () => query,
    limit: async () => [
      {
        id: "attachment",
        objectKey: "key",
        sizeBytes: 12,
        sha256: "a".repeat(64),
        contentType: "text/plain",
        fileName: "file.txt",
        verifiedAt,
        assignee,
      },
    ],
  };
  const db = {
    select: () => query,
    delete: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  };
  mocks.getDb.mockReturnValue(db);
  return db;
}
function request() {
  return new Request(
    "https://reports.example/api/tasks/attachments?id=attachment",
    { method: "PATCH", headers: { origin: "https://reports.example" } },
  );
}
it("returns success for an authorized retry without rescanning or modifying data", async () => {
  const db = database(new Date());
  expect((await PATCH(request())).status).toBe(200);
  expect(mocks.verifyObject).not.toHaveBeenCalled();
  expect(mocks.scanObject).not.toHaveBeenCalled();
  expect(db.update).not.toHaveBeenCalled();
  expect(db.insert).not.toHaveBeenCalled();
});
it("checks permission even when the attachment was already verified", async () => {
  database(new Date(), "other");
  expect((await PATCH(request())).status).toBe(403);
  expect(mocks.scanObject).not.toHaveBeenCalled();
});
it.each([true, false])(
  "commits confirmation and audit together when changed=%s",
  async (changed) => {
    const db = database(null);
    const audit = vi.fn().mockResolvedValue(undefined);
    const returning = vi
      .fn()
      .mockResolvedValue(changed ? [{ id: "attachment" }] : []);
    const tx = {
      update: () => ({ set: () => ({ where: () => ({ returning }) }) }),
      insert: () => ({ values: audit }),
    };
    const transaction = vi.fn(
      async (action: (value: typeof tx) => Promise<void>) => action(tx),
    );
    mocks.getDb.mockReturnValue({ ...db, transaction });
    expect((await PATCH(request())).status).toBe(changed ? 200 : 409);
    expect(transaction).toHaveBeenCalledOnce();
    expect(audit).toHaveBeenCalledTimes(changed ? 1 : 0);
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  },
);
it("keeps an unverified attachment for retry when the scanner is unavailable", async () => {
  const db = database(null);
  mocks.verifyObject.mockResolvedValue(undefined);
  mocks.scanObject.mockRejectedValue(new Error("scanner unavailable"));
  const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
  try {
    expect((await PATCH(request())).status).toBe(500);
    expect(mocks.deleteObject).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});
