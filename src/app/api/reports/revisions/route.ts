import { and, eq } from "drizzle-orm";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { revisionDecision } from "@/lib/domain";
import { revisionInput } from "@/lib/revision-input";
import { getDb } from "@/lib/db";
import {
  auditLog,
  report,
  reportRevision,
  revisionRequest,
} from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    const parsed = revisionInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) throw new BusinessError("修订内容、原因或版本无效");
    const input = parsed.data;
    const result = await getDb().transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(report)
        .where(
          and(
            eq(report.id, input.reportId),
            eq(report.organizationId, actor.organizationId),
          ),
        )
        .limit(1)
        .for("update");
      if (!item || (item.authorId !== actor.id && actor.role !== "BOSS"))
        throw new BusinessError("报告不存在或无权修订", 404);
      if (item.status !== "SUBMITTED" || !item.submittedAt)
        throw new BusinessError("只有已提交报告可以修订");
      if (item.version !== input.version)
        throw new BusinessError("报告已更新，请刷新后核对", 409);
      if ((item.summary ?? "") === input.summary)
        throw new BusinessError("修订内容与当前报告相同");
      const now = new Date();
      if (revisionDecision(item.submittedAt, now) === "APPROVAL_REQUIRED") {
        const [pending] = await tx
          .select({ id: revisionRequest.id })
          .from(revisionRequest)
          .where(
            and(
              eq(revisionRequest.organizationId, actor.organizationId),
              eq(revisionRequest.reportId, item.id),
              eq(revisionRequest.requesterId, actor.id),
              eq(revisionRequest.status, "PENDING"),
            ),
          )
          .limit(1);
        if (pending)
          throw new BusinessError("已有待审核修订，请先处理该申请", 409);
        const id = crypto.randomUUID();
        await tx
          .insert(revisionRequest)
          .values({
            id,
            organizationId: actor.organizationId,
            reportId: item.id,
            requesterId: actor.id,
            baseVersion: item.version,
            reason: input.reason,
            proposedChanges: { summary: input.summary },
          });
        await tx
          .insert(auditLog)
          .values({
            id: crypto.randomUUID(),
            organizationId: actor.organizationId,
            actorId: actor.id,
            action: "REVISION_REQUEST_CREATE",
            resourceType: "REVISION_REQUEST",
            resourceId: id,
            result: "SUCCESS",
          });
        return { id, status: "PENDING" };
      }
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
        !previous ||
        !previous.snapshot ||
        typeof previous.snapshot !== "object" ||
        Array.isArray(previous.snapshot)
      )
        throw new BusinessError("历史快照缺失，无法安全修订", 409);
      const revisionNumber = item.revisionNumber + 1;
      await tx
        .insert(reportRevision)
        .values({
          id: crypto.randomUUID(),
          organizationId: actor.organizationId,
          reportId: item.id,
          revisionNumber,
          editorId: actor.id,
          reason: input.reason,
          snapshot: {
            ...previous.snapshot,
            summary: input.summary,
            revisionNumber,
            version: item.version + 1,
          },
          diff: { summary: [item.summary, input.summary] },
        });
      await tx
        .update(report)
        .set({
          summary: input.summary || null,
          revisionNumber,
          version: item.version + 1,
          updatedAt: now,
        })
        .where(eq(report.id, item.id));
      await tx
        .insert(auditLog)
        .values({
          id: crypto.randomUUID(),
          organizationId: actor.organizationId,
          actorId: actor.id,
          action: "REPORT_REVISE",
          resourceType: "REPORT",
          resourceId: item.id,
          result: "SUCCESS",
        });
      return {
        id: item.id,
        status: "REVISED",
        version: item.version + 1,
        revisionNumber,
      };
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
