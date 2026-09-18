import { expect, it } from "vitest";
import ExcelJS from "exceljs";
import { parseTaskExcel } from "../src/lib/task-excel-parser";

async function file(columns = 1) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("任务");
  sheet.addRow(Array.from({ length: columns }, (_, i) => `column${i}`));
  sheet.addRow(["value"]);
  return new Uint8Array(await workbook.xlsx.writeBuffer()).buffer;
}
it("terminates timed-out parsers and releases capacity for the next file", async () => {
  const bytes = await file();
  await expect(parseTaskExcel(bytes, 1)).rejects.toMatchObject({ status: 413 });
  await expect(parseTaskExcel(bytes)).resolves.toEqual([{ column0: "value" }]);
});
it("limits concurrent parser processes and recovers after completion", async () => {
  const bytes = await file();
  const first = parseTaskExcel(bytes);
  const second = parseTaskExcel(bytes);
  await expect(parseTaskExcel(bytes)).rejects.toMatchObject({ status: 429 });
  await Promise.all([first, second]);
  await expect(parseTaskExcel(bytes)).resolves.toEqual([{ column0: "value" }]);
});
it("rejects excessively wide workbooks", async () => {
  await expect(parseTaskExcel(await file(33))).rejects.toThrow("列数过多");
});
it("rejects oversized input before starting a parser", async () => {
  await expect(
    parseTaskExcel(new ArrayBuffer(10 * 1024 * 1024 + 1)),
  ).rejects.toMatchObject({ status: 413 });
});
