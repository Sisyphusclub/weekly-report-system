import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { apiError, BusinessError, enforceRateLimit, writeActor } from "@/lib/api";
import { getDb } from "@/lib/db";
import { auditLog, report, reportTask, user } from "@/lib/db/schema";
import { reportExportVisibility } from "@/lib/reports";
import { reportFilter } from "@/lib/report-filter";

const querySchema = z.object({
  q: z.string().trim().max(200).default(""),
  from: z.string().optional(),
  to: z.string().optional(),
});
export async function GET(request: Request) {
  try {
    const actor = await writeActor(request);
    enforceRateLimit(`report-export:${actor.organizationId}:${actor.id}`, 10, 60_000);
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      q: url.searchParams.get("q") ?? "",
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });
    if (!parsed.success) throw new BusinessError("导出筛选条件无效");
    const dates = reportFilter.safeParse({
      from: parsed.data.from,
      to: parsed.data.to,
    });
    if (!dates.success) throw new BusinessError("日期范围无效");
    const filter = and(
      reportExportVisibility(actor),
      dates.data.from
        ? gte(
            sql`coalesce(${report.reportDate}, ${report.weekEnd})`,
            dates.data.from,
          )
        : undefined,
      dates.data.to
        ? lte(
            sql`coalesce(${report.reportDate}, ${report.weekStart})`,
            dates.data.to,
          )
        : undefined,
      parsed.data.q
        ? sql`${report.summary} ilike ${`%${parsed.data.q.replace(/[\\%_]/g, "\\$&")}%`}`
        : undefined,
    );
    const db = getDb();
    const reports = await db
      .select({
        id: report.id,
        type: report.type,
        status: report.status,
        reportDate: report.reportDate,
        weekStart: report.weekStart,
        weekEnd: report.weekEnd,
        authorId: report.authorId,
        author: user.name,
        summary: report.summary,
        submittedAt: report.submittedAt,
        wasLate: report.wasLate,
        version: report.version,
        revisionNumber: report.revisionNumber,
      })
      .from(report)
      .innerJoin(user, eq(user.id, report.authorId))
      .where(filter)
      .orderBy(asc(report.reportDate), asc(report.weekStart), asc(report.id));
    const ids = reports.map((item) => item.id);
    const tasks = ids.length
      ? await db
          .select({
            reportId: reportTask.reportId,
            taskId: reportTask.taskId,
            snapshot: reportTask.snapshot,
            sourceReportId: reportTask.sourceReportId,
          })
          .from(reportTask)
          .where(
            and(
              eq(reportTask.organizationId, actor.organizationId),
              inArray(reportTask.reportId, ids),
            ),
          )
      : [];
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "REPORT_EXPORT",
      resourceType: "REPORT",
      resourceId: "FILTER",
      result: "SUCCESS",
    });
    return new Response(
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        generatedBy: actor.id,
        reports: reports.map((item) => ({
          ...item,
          tasks: tasks.filter((task) => task.reportId === item.id),
        })),
      }),
      {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="reports-${new Date().toISOString().slice(0, 10)}.json"`,
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
