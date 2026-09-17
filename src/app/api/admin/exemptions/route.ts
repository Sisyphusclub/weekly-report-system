import { and, eq, ne, sql } from "drizzle-orm";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { exemptionInput } from "@/lib/exemption-input";
import { getDb } from "@/lib/db";
import { auditLog, reportingExemption, user } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role !== "ADMIN")
      throw new BusinessError("仅管理员可设置免报", 403);
    const parsed = exemptionInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      throw new BusinessError("成员、日期范围或免报原因无效");
    const input = parsed.data;
    const result = await getDb().transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`exemption:${actor.organizationId}:${input.userId}`}, 0))`,
      );
      const [target] = await tx
        .select({ id: user.id })
        .from(user)
        .where(
          and(
            eq(user.id, input.userId),
            eq(user.organizationId, actor.organizationId),
            eq(user.status, "ACTIVE"),
            ne(user.role, "ADMIN"),
          ),
        )
        .limit(1)
        .for("share");
      if (!target) throw new BusinessError("请选择本组织的有效业务成员", 400);
      const [existing] = await tx
        .select({ id: reportingExemption.id })
        .from(reportingExemption)
        .where(
          and(
            eq(reportingExemption.organizationId, actor.organizationId),
            eq(reportingExemption.userId, input.userId),
            eq(reportingExemption.startDate, input.startDate),
            eq(reportingExemption.endDate, input.endDate),
            eq(reportingExemption.reason, input.reason),
          ),
        )
        .limit(1);
      if (existing) return existing;
      const id = crypto.randomUUID();
      await tx.insert(reportingExemption).values({
        ...input,
        id,
        organizationId: actor.organizationId,
        createdById: actor.id,
      });
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "REPORTING_EXEMPTION_CREATE",
        resourceType: "REPORTING_EXEMPTION",
        resourceId: id,
        result: "SUCCESS",
      });
      return { id };
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
