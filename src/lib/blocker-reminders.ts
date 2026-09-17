export type ReminderBlocker = {
  id: string;
  severity: "NORMAL" | "IMPORTANT" | "URGENT";
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  createdAt: Date;
  coordinatorId: string | null;
};
export type BlockerReminder = {
  recipientId: string;
  blockerId: string;
  type: "BLOCKER_24H";
  dedupeKey: string;
  title: string;
};
export function overdueBlockerReminders(input: {
  now: Date;
  blockers: ReminderBlocker[];
  bosses: string[];
}) {
  const result: BlockerReminder[] = [];
  for (const item of input.blockers) {
    if (
      item.status === "RESOLVED" ||
      item.severity !== "IMPORTANT" ||
      input.now.getTime() - item.createdAt.getTime() < 24 * 60 * 60 * 1000
    )
      continue;
    for (const recipientId of item.coordinatorId
      ? [item.coordinatorId]
      : input.bosses)
      result.push({
        recipientId,
        blockerId: item.id,
        type: "BLOCKER_24H",
        dedupeKey: `blocker-24h:${item.id}:${recipientId}`,
        title: "重要阻塞已超过 24 小时未解决",
      });
  }
  return result;
}
