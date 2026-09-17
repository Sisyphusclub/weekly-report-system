import { and, desc, eq, sql } from "drizzle-orm";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { calendarInput } from "@/lib/calendar-input";
import { getDb } from "@/lib/db";
import { auditLog, workCalendarDay } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role !== "ADMIN")
      throw new BusinessError("仅管理员可修改工作日历", 403);
    const parsed = calendarInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) throw new BusinessError("日期、说明或版本无效");
    const input = parsed.data;
    const result = await getDb().transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`calendar:${actor.organizationId}:${input.date}`}, 0))`,
      );
      const [existing] = await tx
        .select()
        .from(workCalendarDay)
        .where(
          and(
            eq(workCalendarDay.organizationId, actor.organizationId),
            eq(workCalendarDay.date, input.date),
          ),
        )
        .orderBy(desc(workCalendarDay.version))
        .limit(1);
      if ((existing?.version ?? 0) !== input.version)
        throw new BusinessError("该日期已被修改，请刷新后核对", 409);
      const id = crypto.randomUUID();
      const version = input.version + 1;
      await tx.insert(workCalendarDay).values({
        id,
        organizationId: actor.organizationId,
        date: input.date,
        isWorkday: input.isWorkday,
        description: input.description,
        version,
      });
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "CALENDAR_OVERRIDE",
        resourceType: "WORK_CALENDAR_DAY",
        resourceId: id,
        result: "SUCCESS",
      });
      return { id, version };
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
