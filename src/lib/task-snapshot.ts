import { z } from "zod";
export const taskSnapshot = z.object({
  content: z.string(),
  kind: z.enum(["ACTUAL", "PLAN"]),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELED"]),
  categoryName: z.string(),
  dueDate: z.string().nullable().optional(),
  deliverables: z
    .array(
      z.object({
        unitId: z.string(),
        unitName: z.string(),
        quantity: z.union([z.string(), z.number()]),
      }),
    )
    .default([]),
});
