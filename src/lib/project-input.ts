import { z } from "zod";
import { dateInput } from "@/lib/daily-input";
export const projectInput = z
  .object({
    id: z.string().uuid().optional(),
    version: z.number().int().min(0),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(5000).default(""),
    ownerId: z.string().min(1).max(200),
    memberIds: z.array(z.string().min(1).max(200)).max(100),
    status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]),
    startDate: dateInput.nullable(),
    targetEndDate: dateInput.nullable(),
  })
  .superRefine((value, ctx) => {
    if (
      value.startDate &&
      value.targetEndDate &&
      value.startDate > value.targetEndDate
    )
      ctx.addIssue({
        code: "custom",
        path: ["targetEndDate"],
        message: "结束日期不能早于开始日期",
      });
    if ((!value.id && value.version !== 0) || (value.id && value.version < 1))
      ctx.addIssue({
        code: "custom",
        path: ["version"],
        message: "项目版本无效",
      });
  });
