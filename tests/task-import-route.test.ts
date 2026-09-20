import { beforeEach, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";
const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), getDb: vi.fn() }));
vi.mock("@/lib/access", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/config", () => ({
  getConfig: () => ({ BETTER_AUTH_URL: "https://reports.example" }),
}));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
import { POST } from "../src/app/api/tasks/import/route";
import { workTask } from "../src/lib/db/schema";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.currentUser.mockResolvedValue({
    id: crypto.randomUUID(),
    organizationId: "org",
    role: "EMPLOYEE",
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
it.each([false, true])(
  "imports Excel date cells with date1904=%s",
  async (date1904) => {
    mocks.currentUser.mockResolvedValue({
      id: "employee",
      organizationId: "org",
      role: "EMPLOYEE",
    });
    const writes: Array<{ table: unknown; data: Record<string, unknown> }> = [];
    const query = {
      from: () => query,
      innerJoin: () => query,
      where: () => query,
      limit: async () => [{ categoryName: "开发" }],
    };
    const tx = {
      select: () => query,
      insert: (table: unknown) => ({
        values: async (data: Record<string, unknown>) => {
          writes.push({ table, data });
        },
      }),
    };
    mocks.getDb.mockReturnValue({
      transaction: (action: (transaction: typeof tx) => Promise<unknown>) =>
        action(tx),
    });
    const workbook = new ExcelJS.Workbook();
    workbook.properties.date1904 = date1904;
    const sheet = workbook.addWorksheet("任务");
    sheet.addRow([
      "项目编号",
      "分类编号",
      "负责人编号",
      "任务内容",
      "任务类型",
      "工作日期",
      "截止日期",
    ]);
    sheet.addRow([
      "project",
      "category",
      "employee",
      "完成开发",
      "ACTUAL",
      new Date("2026-09-18T00:00:00Z"),
      " ",
    ]);
    sheet.getCell("F2").numFmt = "yyyy-mm-dd";
    const response = await POST(
      upload(new Uint8Array(await workbook.xlsx.writeBuffer())),
    );
    expect(response.status).toBe(201);
    expect(
      writes.find((entry) => entry.table === workTask)?.data,
    ).toMatchObject({ workDate: "2026-09-18", dueDate: null });
  },
);
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
