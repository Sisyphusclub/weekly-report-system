import { and, eq, sql } from "drizzle-orm";
import { writeActor, BusinessError, apiError } from "@/lib/api";
import { dictionaryInput } from "@/lib/dictionary-input";
import { getDb } from "@/lib/db";
import { category, deliverableUnit, auditLog } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role !== "ADMIN")
      throw new BusinessError("仅管理员可维护基础资料", 403);
    const parsed = dictionaryInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) throw new BusinessError("名称、排序或版本格式无效");
    const input = parsed.data;
    const table = input.kind === "category" ? category : deliverableUnit;
    const result = await getDb().transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${actor.organizationId}:dictionary:${input.kind}`}, 0))`,
      );
      const [duplicate] = await tx
        .select({ id: table.id })
        .from(table)
        .where(
          and(
            eq(table.organizationId, actor.organizationId),
            eq(table.name, input.name),
          ),
        )
        .limit(1);
      if (duplicate && duplicate.id !== input.id)
        throw new BusinessError("名称已存在，请使用其他名称", 409);
      const values = {
        name: input.name,
        enabled: input.enabled,
        sortOrder: input.sortOrder,
        updatedAt: new Date(),
      };
      const id = input.id ?? crypto.randomUUID();
      if (input.id) {
        const rows = await tx
          .update(table)
          .set(values)
          .where(
            and(
              eq(table.organizationId, actor.organizationId),
              eq(table.id, id),
              eq(table.updatedAt, new Date(input.expectedUpdatedAt!)),
            ),
          )
          .returning({ id: table.id });
        if (!rows.length)
          throw new BusinessError("资料不存在或已被更新，请刷新核对", 409);
      } else
        await tx
          .insert(table)
          .values({ id, organizationId: actor.organizationId, ...values });
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: input.id ? "DICTIONARY_UPDATE" : "DICTIONARY_CREATE",
        resourceType: input.kind,
        resourceId: id,
        result: "SUCCESS",
      });
      return { id, ...values };
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
