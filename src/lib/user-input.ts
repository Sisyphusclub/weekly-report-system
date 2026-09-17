import { z } from "zod";
export const createUserInput = z
  .object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_.]{3,30}$/),
    name: z.string().trim().min(1).max(100),
    title: z.string().trim().max(100).default(""),
    role: z.enum(["EMPLOYEE", "BOSS", "ADMIN"]),
  })
  .strict();
