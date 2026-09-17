import { z } from "zod";
export const externalLinkInput = z.object({
  taskId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  url: z.string().url().max(2000),
});
