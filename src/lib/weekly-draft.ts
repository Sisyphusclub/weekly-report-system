export function shouldGenerateWeeklyDraft(input: {
  now: Date;
  dueAt: Date;
  existing: boolean;
  submitted: boolean;
}) {
  return !input.existing && !input.submitted && input.now >= input.dueAt;
}

export function draftSummary(
  summaries: Array<{ date: string; summary: string | null }>,
) {
  return (
    summaries
      .filter((item) => item.summary?.trim())
      .map((item) => `${item.date}：${item.summary!.trim()}`)
      .join("\n") || null
  );
}
