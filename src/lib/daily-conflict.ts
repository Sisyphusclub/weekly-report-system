import { z } from "zod";
import { dailyBlockersSchema, dailyEntriesSchema } from "./daily-input";
export const remoteDailyDraft = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  status: z.enum(["DRAFT", "SUBMITTED"]),
  summary: z.string(),
  noWorkReason: z.string(),
  noPlanReason: z.string(),
  taskIds: z.array(z.string()),
  plans: dailyEntriesSchema.optional(),
  works: dailyEntriesSchema.optional(),
  blockers: dailyBlockersSchema.optional(),
});
export type RemoteDailyDraft = z.infer<typeof remoteDailyDraft>;
export class DailyConflict extends Error {
  constructor(public remote: RemoteDailyDraft) {
    super(
      remote.status === "SUBMITTED"
        ? "日报已提交，请通过修订流程修改"
        : "日报已在其他设备更新，请核对差异后选择保留内容",
    );
  }
}
