import { beforeEach, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";
const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), getDb: vi.fn() }));
vi.mock("@/lib/access", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/config", () => ({
  getConfig: () => ({ BETTER_AUTH_URL: "https://reports.example" }),
}));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
import { POST } from "../src/app/api/tasks/import/route";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.currentUser.mockResolvedValue({
    id: crypto.randomUUID(),
    organizationId: "org",
    role: "EMPLOYEE",
    mustChangePassword: false,
  });
});
function upload(bytes: BlobPart) {
  const form = new FormData();
  form.set("file", new Blob([bytes]), "tasks.xlsx");
  return new Request("https://reports.example/api/tasks/import", {
    method: "POST",
    headers: { origin: "https://reports.example" },
    body: form,
  });
}
it("returns an actionable client error for a corrupt workbook", async () => {
  const response = await POST(upload("not a zip workbook"));
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain("确认文件完整且未加密");
  expect(mocks.getDb).not.toHaveBeenCalled();
});
it("rejects malformed multipart before database access", async () => {
  const response = await POST(
    new Request("https://reports.example/api/tasks/import", {
      method: "POST",
      headers: {
        origin: "https://reports.example",
        "content-type": "multipart/form-data",
      },
      body: "invalid",
    }),
  );
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain("重新选择 Excel 文件");
  expect(mocks.getDb).not.toHaveBeenCalled();
});
it("rejects 201 actual rows before starting a transaction", async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("任务");
  sheet.addRow(["content"]);
  for (let i = 0; i < 201; i++) sheet.addRow([`任务 ${i}`]);
  const response = await POST(
    upload(new Uint8Array(await workbook.xlsx.writeBuffer())),
  );
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain("最多导入 200 条");
  expect(mocks.getDb).not.toHaveBeenCalled();
});
