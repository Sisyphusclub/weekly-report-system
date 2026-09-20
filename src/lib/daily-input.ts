import { z } from "zod";
import { deadline } from "@/lib/domain";
export const dateInput = z.string().refine((value) => {
  try {
    deadline(value);
    return true;
  } catch {
    return false;
  }
}, "日期无效");
export const dailyEntrySchema = z.object({
  content: z.string().trim().min(1).max(5000),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELED"]),
  category: z.string().trim().min(1).max(100),
  deliverables: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  projectId: z.string().trim().min(1).max(200).nullable().optional(),
});
export const dailyEntriesSchema = z.array(dailyEntrySchema).max(100);
export const dailyBlockerSchema = z.object({
  description: z.string().trim().min(1).max(5000),
  projectId: z.string().trim().min(1).max(200),
  projectName: z.string().trim().min(1).max(200).optional(),
  severity: z.enum(["NORMAL", "IMPORTANT", "URGENT"]),
});
export const dailyBlockersSchema = z.array(dailyBlockerSchema).max(20);
export type DailyEntry = z.infer<typeof dailyEntrySchema>;
export type DailyBlocker = z.infer<typeof dailyBlockerSchema>;
export const dailyInput = z.object({
  reportDate: dateInput,
  summary: z.string().trim().max(10000).default(""),
  noWorkReason: z.string().trim().max(200).default(""),
  noPlanReason: z.string().trim().max(200).default(""),
  plans: dailyEntriesSchema.default([]),
  works: dailyEntriesSchema.default([]),
  blockers: dailyBlockersSchema.default([]),
  submit: z.boolean().default(false),
  version: z.number().int().min(0),
  taskIds: z.array(z.string().uuid()).max(100).default([]),
});
export function shanghaiDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
