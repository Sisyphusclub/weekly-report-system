import { z } from "zod";

export const settingsInput = z
  .object({
    name: z.string().trim().min(1).max(80),
    version: z.number().int().min(1).max(2_147_483_646),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
