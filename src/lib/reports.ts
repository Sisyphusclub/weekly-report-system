import { and, or, eq, desc, ilike, count, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { report, user } from "@/lib/db/schema";
import type { Actor } from "@/lib/domain";

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
export async function listReports(
  actor: Actor,
  query: string,
  page: number,
  dates: { from?: string; to?: string } = {},
) {
  const filter = and(
    reportVisibility(actor),
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
