import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { writeActor, BusinessError, apiError } from "@/lib/api";
import { getDb } from "@/lib/db";
import {
  auditLog,
  report,
  reportRevision,
  reportingExemption,
  workCalendarDay,
  reportTask,
} from "@/lib/db/schema";
import { buildWeeklySnapshot, weeklyPeriod, weekDates } from "@/lib/domain";
import { dateInput, shanghaiDate } from "@/lib/daily-input";
const input = z.object({
  date: dateInput,
  summary: z.string().trim().max(10000).default(""),
  submit: z.boolean().default(false),
  version: z.number().int().min(0),
});
export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role === "ADMIN")
      throw new BusinessError("管理员不能提交周报", 403);
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new BusinessError("周报内容格式无效");
    const value = parsed.data;
    const period = weeklyPeriod(value.date);
    const result = await getDb().transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${actor.organizationId}:${actor.id}:weekly:${period.weekStart}`}, 0))`,
      );
      const calendar = await tx
        .select()
        .from(workCalendarDay)
        .where(
          and(
            eq(workCalendarDay.organizationId, actor.organizationId),
            gte(workCalendarDay.date, period.weekStart),
            lte(workCalendarDay.date, period.weekEnd),
          ),
        )
        .orderBy(desc(workCalendarDay.version));
      const overrides: Record<string, boolean> = {};
      for (const day of calendar)
        if (!(day.date in overrides)) overrides[day.date] = day.isWorkday;
      let actualPeriod;
      try {
        actualPeriod = weeklyPeriod(value.date, overrides);
      } catch {
        throw new BusinessError("本周无工作日");
      }
      if (value.submit && shanghaiDate() < actualPeriod.dueDate)
        throw new BusinessError("请在本周最后一个工作日提交周报");
      const days = await tx
        .select({ id: report.id, reportDate: report.reportDate, summary: report.summary })
        .from(report)
        .where(
          and(
            eq(report.organizationId, actor.organizationId),
            eq(report.authorId, actor.id),
            eq(report.type, "DAILY"),
            eq(report.status, "SUBMITTED"),
            gte(report.reportDate, period.weekStart),
            lte(report.reportDate, period.weekEnd),
          ),
        );
      const exemptions = await tx
        .select({
          startDate: reportingExemption.startDate,
          endDate: reportingExemption.endDate,
        })
        .from(reportingExemption)
        .where(
          and(
            eq(reportingExemption.organizationId, actor.organizationId),
            eq(reportingExemption.userId, actor.id),
            lte(reportingExemption.startDate, period.weekEnd),
            gte(reportingExemption.endDate, period.weekStart),
          ),
        );
      const sources = weekDates(value.date).map((reportDate) => ({
        reportDate,
        reportId: days.find((day) => day.reportDate === reportDate)?.id,
        summary: days.find((day) => day.reportDate === reportDate)?.summary,
        submitted: days.some((day) => day.reportDate === reportDate),
        exempt: exemptions.some(
          (e) => reportDate >= e.startDate && reportDate <= e.endDate,
        ),
      }));
      const sourceIds = days.map((day) => day.id);
      const sourceTasks = sourceIds.length
        ? await tx.select().from(reportTask).where(and(eq(reportTask.organizationId, actor.organizationId), sql`${reportTask.sourceReportId} in ${sourceIds}`))
        : [];
      (sources as Array<Record<string, unknown>>).forEach((source) => {
        source.tasks = source.reportId ? sourceTasks.filter((task) => task.sourceReportId === source.reportId).map((task) => task.snapshot) : [];
      });
      let snapshot;
      try {
        snapshot = value.submit
          ? buildWeeklySnapshot(value.date, sources, overrides)
          : {
              ...actualPeriod,
              summaries: days.map((day) => ({
                date: day.reportDate!,
                summary: day.summary ?? "",
              })),
              sourceDates: days.map((day) => day.reportDate!),
            };
      } catch (error) {
        throw new BusinessError((error as Error).message);
      }
      const [existing] = await tx
        .select()
        .from(report)
        .where(
          and(
            eq(report.organizationId, actor.organizationId),
            eq(report.authorId, actor.id),
            eq(report.type, "WEEKLY"),
            eq(report.weekStart, period.weekStart),
          ),
        )
        .limit(1);
      if (existing?.status === "SUBMITTED")
        throw new BusinessError("周报已提交，请通过修订流程修改", 409);
      if ((existing?.version ?? 0) !== value.version)
        throw new BusinessError("周报已在其他设备更新，请刷新重试", 409);
      const id = existing?.id ?? crypto.randomUUID();
      const now = new Date();
      const values = {
        summary:
          value.summary ||
          snapshot.summaries
            .map((item) => `${item.date}：${item.summary}`)
            .join("\n") ||
          null,
        status: value.submit ? ("SUBMITTED" as const) : ("DRAFT" as const),
        submittedAt: value.submit ? now : null,
        revisionNumber: value.submit ? 1 : 0,
        version: (existing?.version ?? 1) + 1,
        dueAt: new Date(`${snapshot.dueDate}T10:30:00.000Z`),
        calendarVersion: 0,
        updatedAt: now,
      };
      if (existing)
        await tx.update(report).set(values).where(eq(report.id, id));
      else
        await tx
          .insert(report)
          .values({
            id,
            organizationId: actor.organizationId,
            authorId: actor.id,
            type: "WEEKLY",
            weekStart: snapshot.weekStart,
            weekEnd: snapshot.weekEnd,
            weekLabel: snapshot.weekLabel,
            ...values,
          });
      if (value.submit)
        await tx
          .insert(reportRevision)
          .values({
            id: crypto.randomUUID(),
            organizationId: actor.organizationId,
            reportId: id,
            revisionNumber: 1,
            editorId: actor.id,
            reason: "首次提交周报",
            snapshot,
            diff: { status: ["DRAFT", "SUBMITTED"] },
          });
      await tx
        .insert(auditLog)
        .values({
          id: crypto.randomUUID(),
          organizationId: actor.organizationId,
          actorId: actor.id,
          action: value.submit ? "WEEKLY_REPORT_SUBMIT" : "WEEKLY_REPORT_SAVE",
          resourceType: "REPORT",
          resourceId: id,
          result: "SUCCESS",
        });
      return { id, version: values.version, status: values.status, snapshot };
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
