import { and, eq } from "drizzle-orm";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { getDb } from "@/lib/db";
import { auditLog, organization } from "@/lib/db/schema";
import { settingsInput } from "@/lib/settings-input";

export async function PATCH(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role !== "ADMIN")
      throw new BusinessError("仅管理员可修改系统设置", 403);
    const parsed = settingsInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      throw new BusinessError("请检查组织名称、修改原因和版本");
    const input = parsed.data;
    const result = await getDb().transaction(async (tx) => {
      const [saved] = await tx
        .update(organization)
        .set({
          name: input.name,
          version: input.version + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(organization.id, actor.organizationId),
            eq(organization.version, input.version),
          ),
        )
        .returning({ name: organization.name, version: organization.version });
      if (!saved) throw new BusinessError("设置已被修改，请刷新后核对", 409);
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "ORGANIZATION_SETTINGS_UPDATE",
        resourceType: "ORGANIZATION",
        resourceId: actor.organizationId,
        reason: input.reason,
        result: "SUCCESS",
      });
      return saved;
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
