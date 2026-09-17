import { and, or, eq, desc, ilike, count } from "drizzle-orm";
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
export async function listReports(actor: Actor, query: string, page: number) {
  const filter = and(
    reportVisibility(actor),
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
