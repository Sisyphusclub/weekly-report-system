import { z } from "zod";
export const dictionaryInput = z
  .object({
    kind: z.enum(["category", "unit"]),
    id: z.string().uuid().optional(),
    expectedUpdatedAt: z.string().datetime().optional(),
    name: z.string().trim().min(1).max(80),
    enabled: z.boolean(),
    sortOrder: z.number().int().min(0).max(10000),
  })
  .superRefine((value, ctx) => {
    if (value.id && !value.expectedUpdatedAt)
      ctx.addIssue({
        code: "custom",
        path: ["expectedUpdatedAt"],
        message: "更新必须携带版本",
      });
  });
