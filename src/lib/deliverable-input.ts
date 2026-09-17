import { z } from "zod";
export const deliverableInput = z.object({
  taskId: z.string().min(1),
  unitId: z.string().min(1),
  quantity: z.number().finite().min(0).max(1_000_000_000),
});
