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
export const dailyInput = z.object({
  reportDate: dateInput,
  summary: z.string().trim().max(10000).default(""),
  noWorkReason: z.string().trim().max(200).default(""),
  noPlanReason: z.string().trim().max(200).default(""),
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
