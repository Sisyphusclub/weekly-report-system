import ExcelJS from "exceljs";
import { expect, it } from "vitest";
import { taskWorkbook } from "../src/lib/task-workbook";
import { taskImportInput } from "../src/lib/task-import-input";

it("keeps headers and attribution in an empty exported file", async () => {
  const workbook = taskWorkbook([], "operator", "2026-09-18T00:00:00Z");
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await workbook.xlsx.writeBuffer());
  expect(loaded.worksheets[0].getRow(1).getCell(1).value).toBe("projectId");
  expect(loaded.worksheets[0].rowCount).toBe(1);
  expect(loaded.getWorksheet("导出信息")!.getCell("B2").value).toBe("operator");
  expect(loaded.getWorksheet("导出信息")!.getCell("B1").value).toBe(
    "2026-09-18T00:00:00Z",
  );
});
it("round trips task fields including dates and literal formula-like text", async () => {
  const task = {
    projectId: "project",
    categoryId: "category",
    primaryAssigneeId: "member",
    content: "=SUM(A1:A2)",
    kind: "ACTUAL" as const,
    status: "TODO" as const,
    workDate: "2026-09-18",
    dueDate: null,
  };
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(
    await taskWorkbook([task], "operator").xlsx.writeBuffer(),
  );
  const sheet = loaded.worksheets[0];
  const parsed: Record<string, unknown> = {};
  sheet.getRow(1).eachCell((cell, column) => {
    parsed[String(cell.value)] = sheet.getRow(2).getCell(column).value;
  });
  expect(taskImportInput.parse(parsed)).toEqual(task);
  expect(sheet.getCell("D2").type).toBe(ExcelJS.ValueType.String);
});
