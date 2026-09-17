import { z } from "zod";
export const externalLinkInput = z.object({
  taskId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  url: z
    .string()
    .url()
    .refine((value) => /^https?:\/\//i.test(value), "仅支持 HTTP(S) 链接")
    .max(2000),
});
