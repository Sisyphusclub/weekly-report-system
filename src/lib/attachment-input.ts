import { z } from "zod";

const extensions: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
  "text/plain": ["txt"],
};
export const attachmentInput = z
  .object({
    fileName: z.string().trim().min(1).max(180),
    contentType: z.enum([
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "text/plain",
    ]),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(10 * 1024 * 1024),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .superRefine((value, ctx) => {
    if (
      /[\x00-\x1f\x7f]/.test(value.fileName) ||
      /\.\.(?:[./\\]|$)/.test(value.fileName)
    )
      ctx.addIssue({
        code: "custom",
        path: ["fileName"],
        message: "文件名无效",
      });
    const parts = value.fileName.toLowerCase().split(".");
    const extension = parts.at(-1) ?? "";
    if (parts.length > 2 || !extensions[value.contentType]?.includes(extension))
      ctx.addIssue({
        code: "custom",
        path: ["fileName"],
        message: "文件扩展名与类型不匹配",
      });
  });
