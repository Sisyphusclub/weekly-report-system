import { z } from "zod";
export const revisionInput = z.object({
  reportId: z.string().uuid(),
  version: z.number().int().positive(),
  reason: z.string().trim().min(1).max(500),
  summary: z.string().trim().max(10000),
});
