import { z } from "zod";

export const commentInput = z.object({
  reportId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  body: z.string().trim().min(1).max(5000),
});

export function mentionedUsernames(body: string) {
  return [
    ...new Set(
      [...body.matchAll(/@([a-zA-Z0-9_.]{3,30})/g)].map((match) =>
        match[1].toLowerCase(),
      ),
    ),
  ];
}
