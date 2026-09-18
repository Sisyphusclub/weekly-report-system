import { and, or, eq, desc, ilike, count, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { report, user } from "@/lib/db/schema";
import type { Actor } from "@/lib/domain";
import type { ReportFilter } from "@/lib/report-filter";

export const PAGE_SIZE = 20;
export function reportVisibility(actor: Actor) {
  return and(
    eq(report.organizationId, actor.organizationId),
    actor.role === "ADMIN"
      ? eq(report.authorId, actor.id)
      : or(eq(report.authorId, actor.id), eq(report.status, "SUBMITTED")),
  );
}
export function reportExportVisibility(actor: Actor) {
  return and(
    eq(report.organizationId, actor.organizationId),
    actor.role === "BOSS"
      ? or(eq(report.authorId, actor.id), eq(report.status, "SUBMITTED"))
      : eq(report.authorId, actor.id),
  );
}
export function reportSearchConditions(
  query: string,
  dates: ReportFilter = {},
) {
  return and(
    dates.member ? eq(report.authorId, dates.member) : undefined,
    dates.status ? eq(report.status, dates.status) : undefined,
    dates.type ? eq(report.type, dates.type) : undefined,
    dates.project
      ? sql`exists (select 1 from report_task rt inner join work_task wt on wt.organization_id = rt.organization_id and wt.id = rt.task_id where rt.organization_id = ${report.organizationId} and rt.report_id = ${report.id} and wt.project_id = ${dates.project})`
      : undefined,
    dates.category
      ? sql`exists (select 1 from report_task rt inner join work_task wt on wt.organization_id = rt.organization_id and wt.id = rt.task_id where rt.organization_id = ${report.organizationId} and rt.report_id = ${report.id} and wt.category_id = ${dates.category})`
      : undefined,
    dates.taskStatus
      ? sql`exists (select 1 from report_task rt where rt.organization_id = ${report.organizationId} and rt.report_id = ${report.id} and rt.snapshot->>'status' = ${dates.taskStatus})`
      : undefined,
    dates.blocked
      ? sql`exists (select 1 from report_task rt where rt.organization_id = ${report.organizationId} and rt.report_id = ${report.id} and (rt.snapshot->>'status' = 'BLOCKED') = (${dates.blocked} = 'YES'))`
      : undefined,
    dates.from
      ? gte(sql`coalesce(${report.reportDate}, ${report.weekEnd})`, dates.from)
      : undefined,
    dates.to
      ? lte(sql`coalesce(${report.reportDate}, ${report.weekStart})`, dates.to)
      : undefined,
    query
      ? ilike(report.summary, `%${query.replace(/[\\%_]/g, "\\$&")}%`)
      : undefined,
  );
}
export async function listReports(
  actor: Actor,
  query: string,
  page: number,
  dates: ReportFilter = {},
) {
  const filter = and(
    reportVisibility(actor),
    reportSearchConditions(query, dates),
  );
  const db = getDb();
  const [items, total] = await Promise.all([
    db
      .select({
        id: report.id,
        type: report.type,
        status: report.status,
        date: report.reportDate,
        weekStart: report.weekStart,
        summary: report.summary,
        author: user.name,
        submittedAt: report.submittedAt,
        wasLate: report.wasLate,
        revisionNumber: report.revisionNumber,
      })
      .from(report)
      .innerJoin(user, eq(report.authorId, user.id))
      .where(filter)
      .orderBy(desc(report.createdAt), desc(report.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count: count() }).from(report).where(filter),
  ]);
  return { items, total: total[0].count };
}
