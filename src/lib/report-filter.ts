import { z } from "zod";
import { dateInput } from "@/lib/daily-input";
const optionalDate = z.preprocess(
  (value) => (value === "" ? undefined : value),
  dateInput.optional(),
);
export const reportFilter = z
  .object({
    from: optionalDate,
    to: optionalDate,
    member: z.preprocess(
      (value) => (value === "" || value === "ALL" ? undefined : value),
      z.string().trim().min(1).max(200).optional(),
    ),
    status: z.preprocess(
      (value) => (value === "" || value === "ALL" ? undefined : value),
      z.enum(["DRAFT", "SUBMITTED"]).optional(),
    ),
    type: z.preprocess(
      (value) => (value === "" || value === "ALL" ? undefined : value),
      z.enum(["DAILY", "WEEKLY"]).optional(),
    ),
    project: z.preprocess(
      (value) => (value === "" || value === "ALL" ? undefined : value),
      z.string().trim().min(1).max(200).optional(),
    ),
    category: z.preprocess(
      (value) => (value === "" || value === "ALL" ? undefined : value),
      z.string().trim().min(1).max(200).optional(),
    ),
    taskStatus: z.preprocess(
      (value) => (value === "" || value === "ALL" ? undefined : value),
      z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELED"]).optional(),
    ),
    blocked: z.preprocess(
      (value) => (value === "" || value === "ALL" ? undefined : value),
      z.enum(["YES", "NO"]).optional(),
    ),
  })
  .refine(
    (value) => !value.from || !value.to || value.from <= value.to,
    "开始日期不能晚于结束日期",
  );

export type ReportFilter = z.output<typeof reportFilter>;

export function reportFilterParams(
  query: string,
  filters: ReportFilter,
  page?: number,
) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  for (const key of [
    "from",
    "to",
    "member",
    "status",
    "type",
    "project",
    "category",
    "taskStatus",
    "blocked",
  ] as const) {
    if (filters[key]) params.set(key, filters[key]);
  }
  if (page !== undefined) params.set("page", String(page));
  return params.toString();
}
