import { and, eq, isNull } from "drizzle-orm";
import { writeActor, BusinessError, apiError } from "@/lib/api";
import { getDb } from "@/lib/db";
import {
  auditLog,
  category,
  deliverable,
  deliverableUnit,
  dictionaryMerge,
  workTask,
} from "@/lib/db/schema";
import { z } from "zod";
const input = z.object({
  kind: z.enum(["category", "unit"]),
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
});
export async function GET(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role !== "ADMIN")
      throw new BusinessError("仅管理员可查看合并记录", 403);
    const items = await getDb()
      .select()
      .from(dictionaryMerge)
      .where(
        and(
          eq(dictionaryMerge.organizationId, actor.organizationId),
          isNull(dictionaryMerge.undoneAt),
        ),
      );
    return Response.json({
      items: items.filter((item) => item.expiresAt >= new Date()),
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role !== "ADMIN")
      throw new BusinessError("仅管理员可合并资料", 403);
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success || parsed.data.sourceId === parsed.data.targetId)
      throw new BusinessError("合并资料无效");
    const v = parsed.data;
    const result = await getDb().transaction(async (tx) => {
      const table = v.kind === "category" ? category : deliverableUnit;
      const [source] = await tx
        .select({ id: table.id })
        .from(table)
        .where(
          and(
            eq(table.organizationId, actor.organizationId),
            eq(table.id, v.sourceId),
            eq(table.enabled, true),
          ),
        )
        .limit(1);
      const [target] = await tx
        .select({ id: table.id, name: table.name })
        .from(table)
        .where(
          and(
            eq(table.organizationId, actor.organizationId),
            eq(table.id, v.targetId),
            eq(table.enabled, true),
          ),
        )
        .limit(1);
      if (!source || !target) throw new BusinessError("合并资料不存在", 404);
      const snapshot: {
        tasks?: unknown[];
        deliverables?: unknown[];
        deletedDeliverables?: unknown[];
      } = {};
      if (v.kind === "category") {
        snapshot.tasks = await tx
          .select({
            id: workTask.id,
            categoryId: workTask.categoryId,
            categoryName: workTask.categoryName,
          })
          .from(workTask)
          .where(
            and(
              eq(workTask.organizationId, actor.organizationId),
              eq(workTask.categoryId, v.sourceId),
            ),
          )
          .for("update");
        await tx
          .update(workTask)
          .set({
            categoryId: v.targetId,
            categoryName: target.name,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(workTask.organizationId, actor.organizationId),
              eq(workTask.categoryId, v.sourceId),
            ),
          );
      } else {
        const sourceRows = await tx
          .select({
            id: deliverable.id,
            taskId: deliverable.taskId,
            unitName: deliverable.unitName,
            quantity: deliverable.quantity,
          })
          .from(deliverable)
          .where(
            and(
              eq(deliverable.organizationId, actor.organizationId),
              eq(deliverable.unitId, v.sourceId),
            ),
          )
          .for("update");
        snapshot.deliverables = sourceRows;
        snapshot.deletedDeliverables = [];
        for (const row of sourceRows) {
          const [targetRow] = await tx
            .select({ id: deliverable.id, quantity: deliverable.quantity })
            .from(deliverable)
            .where(
              and(
                eq(deliverable.organizationId, actor.organizationId),
                eq(deliverable.taskId, row.taskId),
                eq(deliverable.unitId, v.targetId),
              ),
            )
            .limit(1)
            .for("update");
          if (targetRow) {
            snapshot.deletedDeliverables?.push({
              id: targetRow.id,
              taskId: row.taskId,
              unitName: target.name,
              quantity: targetRow.quantity,
              sourceId: row.id,
              sourceQuantity: row.quantity,
              sourceUnitName: row.unitName,
            });
            await tx
              .update(deliverable)
              .set({
                quantity: String(
                  Number(targetRow.quantity) + Number(row.quantity),
                ),
                updatedAt: new Date(),
              })
              .where(eq(deliverable.id, targetRow.id));
            await tx.delete(deliverable).where(eq(deliverable.id, row.id));
          } else
            await tx
              .update(deliverable)
              .set({
                unitId: v.targetId,
                unitName: target.name,
                updatedAt: new Date(),
              })
              .where(eq(deliverable.id, row.id));
        }
      }
      await tx
        .update(table)
        .set({ enabled: false, updatedAt: new Date() })
        .where(
          and(
            eq(table.organizationId, actor.organizationId),
            eq(table.id, v.sourceId),
          ),
        );
      const id = crypto.randomUUID();
      await tx.insert(dictionaryMerge).values({
        id,
        organizationId: actor.organizationId,
        kind: v.kind,
        sourceId: v.sourceId,
        targetId: v.targetId,
        snapshot,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "DICTIONARY_MERGE",
        resourceType: v.kind,
        resourceId: id,
        result: "SUCCESS",
      });
      return {
        id,
        undoUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
    });
    return Response.json(result);
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role !== "ADMIN")
      throw new BusinessError("仅管理员可撤销合并", 403);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new BusinessError("合并记录无效");
    await getDb().transaction(async (tx) => {
      const [merge] = await tx
        .select()
        .from(dictionaryMerge)
        .where(
          and(
            eq(dictionaryMerge.id, id),
            eq(dictionaryMerge.organizationId, actor.organizationId),
            isNull(dictionaryMerge.undoneAt),
          ),
        )
        .limit(1)
        .for("update");
      if (!merge || merge.expiresAt < new Date())
        throw new BusinessError("撤销窗口已结束", 409);
      const table = merge.kind === "category" ? category : deliverableUnit;
      const snapshot = (merge.snapshot ?? {}) as {
        tasks?: Array<{ id: string; categoryId: string; categoryName: string }>;
        deliverables?: Array<{
          id: string;
          taskId: string;
          unitName: string;
          quantity: string;
          sourceId?: string;
          sourceQuantity?: string;
          sourceUnitName?: string;
        }>;
        deletedDeliverables?: Array<{
          id: string;
          taskId: string;
          unitName: string;
          quantity: string;
        }>;
      };
      if (merge.kind === "category" && snapshot.tasks?.length)
        for (const row of snapshot.tasks)
          await tx
            .update(workTask)
            .set({
              categoryId: row.categoryId,
              categoryName: row.categoryName,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(workTask.organizationId, actor.organizationId),
                eq(workTask.id, row.id),
              ),
            );
      if (merge.kind === "unit" && snapshot.deliverables?.length) {
        for (const row of snapshot.deliverables)
          await tx
            .update(deliverable)
            .set({
              unitId: merge.sourceId,
              unitName: row.unitName,
              quantity: row.quantity,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(deliverable.organizationId, actor.organizationId),
                eq(deliverable.id, row.id),
              ),
            );
        for (const row of snapshot.deletedDeliverables ?? []) {
          await tx
            .update(deliverable)
            .set({ quantity: row.quantity, updatedAt: new Date() })
            .where(
              and(
                eq(deliverable.organizationId, actor.organizationId),
                eq(deliverable.id, row.id),
              ),
            );
          if (row.sourceId && row.sourceQuantity)
            await tx
              .insert(deliverable)
              .values({
                id: row.sourceId,
                organizationId: actor.organizationId,
                taskId: row.taskId,
                unitId: merge.sourceId,
                unitName: row.sourceUnitName ?? "",
                quantity: row.sourceQuantity,
              });
        }
      }
      await tx
        .update(table)
        .set({ enabled: true, updatedAt: new Date() })
        .where(
          and(
            eq(table.organizationId, actor.organizationId),
            eq(table.id, merge.sourceId),
          ),
        );
      await tx
        .update(dictionaryMerge)
        .set({ undoneAt: new Date() })
        .where(eq(dictionaryMerge.id, id));
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "DICTIONARY_MERGE_UNDO",
        resourceType: merge.kind,
        resourceId: id,
        result: "SUCCESS",
      });
    });
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
