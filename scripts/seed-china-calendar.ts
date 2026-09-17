import { and, eq, desc } from "drizzle-orm";
import { getDb } from "../src/lib/db/index.js";
import { workCalendarDay } from "../src/lib/db/schema.js";
import { chinaCalendarPreset } from "../src/lib/china-calendar.js";

async function main() {
  const organizationId = process.env.REMINDER_ORGANIZATION_ID;
  const year = Number(process.env.CALENDAR_YEAR ?? 2026);
  if (!organizationId) throw new Error("REMINDER_ORGANIZATION_ID is required");
  const db = getDb();
  let inserted = 0;
  for (const day of chinaCalendarPreset(year)) {
    const [latest] = await db
      .select({ version: workCalendarDay.version })
      .from(workCalendarDay)
      .where(
        and(
          eq(workCalendarDay.organizationId, organizationId),
          eq(workCalendarDay.date, day.date),
        ),
      )
      .orderBy(desc(workCalendarDay.version))
      .limit(1);
    if (latest) continue;
    await db
      .insert(workCalendarDay)
      .values({
        id: crypto.randomUUID(),
        organizationId,
        date: day.date,
        isWorkday: day.isWorkday,
        description: day.description,
        version: 1,
      });
    inserted++;
  }
  console.log(`China calendar seed complete: ${inserted} dates inserted.`);
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Calendar seed failed",
  );
  process.exitCode = 1;
});
