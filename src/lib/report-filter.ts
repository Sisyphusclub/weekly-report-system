import { z } from "zod";
import { dateInput } from "@/lib/daily-input";
const optionalDate = z.preprocess(
  (value) => (value === "" ? undefined : value),
  dateInput.optional(),
);
export const reportFilter = z
  .object({ from: optionalDate, to: optionalDate })
  .refine(
    (value) => !value.from || !value.to || value.from <= value.to,
    "开始日期不能晚于结束日期",
  );
