import { deadline } from "@/lib/domain";

export function reportTiming(
  date: string,
  calendarVersion: number,
  submit: boolean,
  now: Date,
  existing?: { dueAt: Date; calendarVersion: number; wasLate: boolean } | null,
) {
  const dueAt = existing?.dueAt ?? deadline(date);
  return {
    dueAt,
    calendarVersion: existing?.calendarVersion ?? calendarVersion,
    wasLate: existing?.wasLate === true || (submit && now > dueAt),
  };
}
