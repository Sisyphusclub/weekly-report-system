import { and, eq, inArray, or, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import {
  auditLog,
  blocker,
  deliverable,
  report,
  revisionRequest,
  taskAttachment,
  taskComment,
  workTask,
} from "@/lib/db/schema";
import type { Actor } from "@/lib/domain";

// Unknown resource types and records without a surviving parent fail closed.
export function businessAuditVisibility(actor: Actor) {
  if (actor.role !== "BOSS") return sql`false`;
  const qb = new QueryBuilder();
  const tasks = qb
    .select({ id: workTask.id })
    .from(workTask)
    .where(eq(workTask.organizationId, actor.organizationId));
  const reports = qb
    .select({ id: report.id })
    .from(report)
    .where(
      and(
        eq(report.organizationId, actor.organizationId),
        or(eq(report.authorId, actor.id), eq(report.status, "SUBMITTED")),
      ),
    );
  const taskChildren = [
    ["DELIVERABLE", deliverable],
    ["TASK_ATTACHMENT", taskAttachment],
    ["TASK_COMMENT", taskComment],
  ] as const;
  return and(
    eq(auditLog.organizationId, actor.organizationId),
    or(
      and(
        eq(auditLog.resourceType, "TASK"),
        inArray(auditLog.resourceId, tasks),
      ),
      and(
        inArray(auditLog.resourceType, ["REPORT", "report"]),
        inArray(auditLog.resourceId, reports),
        // Draft-save events remain private even after a later submission.
        or(
          eq(auditLog.actorId, actor.id),
          inArray(auditLog.action, [
            "REPORT_SUBMIT",
            "WEEKLY_REPORT_SUBMIT",
            "REPORT_REVISE",
          ]),
        ),
      ),
      and(
        inArray(auditLog.resourceType, ["BLOCKER", "blocker"]),
        inArray(
          auditLog.resourceId,
          qb
            .select({ id: blocker.id })
            .from(blocker)
            .where(eq(blocker.organizationId, actor.organizationId)),
        ),
      ),
      and(
        eq(auditLog.resourceType, "REVISION_REQUEST"),
        inArray(
          auditLog.resourceId,
          qb
            .select({ id: revisionRequest.id })
            .from(revisionRequest)
            .where(
              and(
                eq(revisionRequest.organizationId, actor.organizationId),
                inArray(revisionRequest.reportId, reports),
              ),
            ),
        ),
      ),
      ...taskChildren.map(([type, table]) =>
        and(
          eq(auditLog.resourceType, type),
          inArray(
            auditLog.resourceId,
            qb
              .select({ id: table.id })
              .from(table)
              .where(
                and(
                  eq(table.organizationId, actor.organizationId),
                  inArray(table.taskId, tasks),
                ),
              ),
          ),
        ),
      ),
    ),
  );
}
