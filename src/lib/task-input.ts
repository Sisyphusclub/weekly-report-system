import { z } from "zod";
import { dateInput } from "@/lib/daily-input";
export const taskInput = z
  .object({
    id: z.string().uuid().optional(),
    version: z.number().int().min(0),
    projectId: z.string().min(1),
    categoryId: z.string().min(1),
    primaryAssigneeId: z.string().min(1),
    content: z.string().trim().min(1).max(5000),
    kind: z.enum(["ACTUAL", "PLAN"]),
    status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELED"]),
    workDate: dateInput.nullable(),
    dueDate: dateInput.nullable(),
    sourceTaskId: z.string().uuid().nullable().default(null),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "ACTUAL" && !value.workDate)
      ctx.addIssue({
        code: "custom",
        path: ["workDate"],
        message: "实际任务必须填写工作日期",
      });
    if (value.kind === "PLAN" && !value.dueDate)
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "计划必须填写截止日期",
      });
    if (value.id ? value.version < 1 : value.version !== 0)
      ctx.addIssue({
        code: "custom",
        path: ["version"],
        message: "任务版本无效",
      });
  });
