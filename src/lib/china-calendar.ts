export type CalendarPreset = {
  date: string;
  isWorkday: boolean;
  description: string;
};

// 2026 mainland statutory holiday arrangement. Company overrides remain append-only.
const HOLIDAYS_2026 = new Set([
  "2026-01-01",
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-02-19",
  "2026-02-20",
  "2026-02-23",
  "2026-04-04",
  "2026-04-06",
  "2026-05-01",
  "2026-05-04",
  "2026-05-05",
  "2026-06-19",
  "2026-06-20",
  "2026-06-21",
  "2026-09-25",
  "2026-09-26",
  "2026-09-27",
  "2026-10-01",
  "2026-10-02",
  "2026-10-03",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
]);
const WORKING_WEEKENDS_2026 = new Set([
  "2026-02-14",
  "2026-02-28",
  "2026-05-09",
  "2026-09-20",
  "2026-10-10",
]);

export function chinaCalendarPreset(year: number): CalendarPreset[] {
  if (year !== 2026)
    throw new Error("当前仅内置 2026 年法定节假日安排，请先核对官方安排后导入");
  const result: CalendarPreset[] = [];
  for (let month = 0; month < 12; month++) {
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (let day = 1; day <= days; day++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const weekend = [0, 6].includes(
        new Date(`${date}T00:00:00Z`).getUTCDay(),
      );
      const isWorkday =
        WORKING_WEEKENDS_2026.has(date) ||
        (!weekend && !HOLIDAYS_2026.has(date));
      if (!isWorkday || WORKING_WEEKENDS_2026.has(date))
        result.push({
          date,
          isWorkday,
          description: WORKING_WEEKENDS_2026.has(date)
            ? "法定节假日调休工作日"
            : "法定节假日",
        });
    }
  }
  return result;
}
