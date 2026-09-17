import { z } from "zod";
export const deliverableInput = z.object({
  taskId: z.string().min(1),
  unitId: z.string().min(1),
  version: z.number().int().positive(),
  quantity: z.number().finite().min(0).max(1_000_000_000).multipleOf(0.0001),
});
