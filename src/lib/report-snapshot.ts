import { z } from "zod";
import { taskSnapshot } from "./task-snapshot";

// Daily reports store tasks directly; weekly reports wrap each frozen task.
const frozenTask = z.union([
  taskSnapshot,
  z.object({ snapshot: taskSnapshot }).transform((row) => row.snapshot),
]);
export const reportSnapshot = z.object({
  summary: z.string().nullable().optional(),
  noWorkReason: z.string().nullable().optional(),
  noPlanReason: z.string().nullable().optional(),
  tasks: z.array(frozenTask),
});
export const reportSummaryDiff = z.object({
  summary: z.tuple([z.string().nullable(), z.string().nullable()]).optional(),
  status: z.tuple([z.string(), z.string()]).optional(),
});
