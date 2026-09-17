import { z } from "zod";
import { dateInput } from "@/lib/daily-input";

export const exemptionInput = z
  .object({
    userId: z.string().trim().min(1).max(200),
    startDate: dateInput,
    endDate: dateInput,
    reason: z.string().trim().min(1).max(500),
  })
  .refine(
    (input) => input.startDate <= input.endDate,
    "结束日期不能早于开始日期",
  );
