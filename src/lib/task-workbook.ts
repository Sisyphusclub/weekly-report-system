import ExcelJS from "exceljs";
import type { z } from "zod";
import type { taskImportInput } from "./task-import-input";

export function taskWorkbook(
  rows: z.infer<typeof taskImportInput>[],
  generatedBy: string,
  generatedAt = new Date().toISOString(),
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = generatedBy;
  workbook.created = new Date(generatedAt);
  const sheet = workbook.addWorksheet("任务");
  sheet.columns = [
    "projectId",
    "categoryId",
    "primaryAssigneeId",
    "content",
    "kind",
    "status",
    "workDate",
    "dueDate",
    "generatedAt",
    "generatedBy",
  ].map((key) => ({ header: key, key }));
  rows.forEach((row) => sheet.addRow({ ...row, generatedAt, generatedBy }));
  const metadata = workbook.addWorksheet("导出信息");
  metadata.addRows([
    ["generatedAt", generatedAt],
    ["generatedBy", generatedBy],
    ["count", rows.length],
  ]);
  return workbook;
}
