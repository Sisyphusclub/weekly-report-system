import { z } from "zod";
import { dateInput } from "@/lib/daily-input";
export const taskImportInput = z.object({
  projectId: z.string().min(1),
  categoryId: z.string().min(1),
  primaryAssigneeId: z.string().min(1),
  content: z.string().trim().min(1).max(5000),
  kind: z.enum(["ACTUAL", "PLAN"]),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELED"]),
  workDate: dateInput.nullable(),
  dueDate: dateInput.nullable(),
});
export const taskImportBatch = z.object({
  items: z.array(taskImportInput).min(1).max(200),
});
