import { z } from "zod";
import { dateInput } from "@/lib/daily-input";
export const calendarInput = z.object({
  date: dateInput,
  isWorkday: z.boolean(),
  description: z.string().trim().min(1).max(200),
  version: z.number().int().min(0),
});
