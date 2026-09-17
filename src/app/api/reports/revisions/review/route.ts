import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { getDb } from "@/lib/db";
import {
  auditLog,
  notification,
  report,
  reportRevision,
  revisionRequest,
} from "@/lib/db/schema";

const inputSchema = z.object({
  requestId: z.string().uuid(),
  version: z.number().int().positive(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().min(1).max(500),
});
const changesSchema = z.object({ summary: z.string().max(10000) }).strict();
export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role !== "BOSS") throw new BusinessError("仅老板可审核修订", 403);
    const parsed = inputSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) throw new BusinessError("审核结果、说明或版本无效");
    const input = parsed.data;
    const result = await getDb().transaction(async (tx) => {
      const scope = and(
        eq(revisionRequest.id, input.requestId),
        eq(revisionRequest.organizationId, actor.organizationId),
      );
      const [reference] = await tx
        .select({ reportId: revisionRequest.reportId })
        .from(revisionRequest)
        .where(scope)
        .limit(1);
      if (!reference) throw new BusinessError("修订申请不存在", 404);
      // Match submission lock order: report, then request.
      const [item] = await tx
        .select()
        .from(report)
        .where(
          and(
            eq(report.id, reference.reportId),
            eq(report.organizationId, actor.organizationId),
          ),
        )
        .limit(1)
        .for("update");
      const [application] = await tx
        .select()
        .from(revisionRequest)
        .where(scope)
        .limit(1)
        .for("update");
      if (!item || !application) throw new BusinessError("修订申请不存在", 404);
      if (
        application.status !== "PENDING" ||
        application.version !== input.version
      )
        throw new BusinessError("申请已处理或更新，请刷新核对", 409);
      const now = new Date();
      if (input.decision === "APPROVED") {
        if (
          item.status !== "SUBMITTED" ||
          item.version !== application.baseVersion
        )
          throw new BusinessError(
            "报告已有新版本，请拒绝此申请并重新发起修订",
            409,
          );
        const changes = changesSchema.safeParse(application.proposedChanges);
        if (!changes.success)
          throw new BusinessError("申请内容无效，无法批准", 409);
        const [previous] = await tx
          .select({ snapshot: reportRevision.snapshot })
          .from(reportRevision)
          .where(
            and(
              eq(reportRevision.organizationId, actor.organizationId),
              eq(reportRevision.reportId, item.id),
              eq(reportRevision.revisionNumber, item.revisionNumber),
            ),
          )
          .limit(1);
        if (
          !previous?.snapshot ||
          typeof previous.snapshot !== "object" ||
          Array.isArray(previous.snapshot)
        )
          throw new BusinessError("历史快照缺失，无法安全修订", 409);
        const revisionNumber = item.revisionNumber + 1;
        await tx.insert(reportRevision).values({
          id: crypto.randomUUID(),
          organizationId: actor.organizationId,
          reportId: item.id,
          revisionNumber,
          editorId: application.requesterId,
          reason: application.reason,
          snapshot: {
            ...previous.snapshot,
            summary: changes.data.summary,
            version: item.version + 1,
            revisionNumber,
          },
          diff: {
            summary: [item.summary, changes.data.summary],
            approval: {
              requestId: application.id,
              reviewerId: actor.id,
              reason: input.reason,
            },
          },
        });
        await tx
          .update(report)
          .set({
            summary: changes.data.summary || null,
            version: item.version + 1,
            revisionNumber,
            updatedAt: now,
          })
          .where(eq(report.id, item.id));
      }
      await tx
        .update(revisionRequest)
        .set({
          status: input.decision,
          reviewerId: actor.id,
          reviewedAt: now,
          reviewReason: input.reason,
          version: application.version + 1,
          updatedAt: now,
        })
        .where(scope);
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: `REVISION_${input.decision}`,
        resourceType: "REVISION_REQUEST",
        resourceId: application.id,
        result: "SUCCESS",
      });
      await tx
        .insert(notification)
        .values({
          id: crypto.randomUUID(),
          organizationId: actor.organizationId,
          recipientId: application.requesterId,
          dedupeKey: `revision-reviewed:${application.id}`,
          type: "REVISION_REVIEWED",
          title:
            input.decision === "APPROVED" ? "修订申请已通过" : "修订申请未通过",
          link: `/reports/${item.id}`,
        })
        .onConflictDoNothing();
      return {
        id: application.id,
        status: input.decision,
        version: application.version + 1,
      };
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
