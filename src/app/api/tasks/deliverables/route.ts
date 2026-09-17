import { and, eq } from "drizzle-orm";
import { deliverableInput } from "@/lib/deliverable-input";
import { writeActor, BusinessError, apiError } from "@/lib/api";
import { getDb } from "@/lib/db";
import {
  auditLog,
  deliverable,
  deliverableUnit,
  workTask,
} from "@/lib/db/schema";
export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    const parsed = deliverableInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) throw new BusinessError("交付物单位或数量无效");
    const input = parsed.data;
    const result = await getDb().transaction(async (tx) => {
      const [refs] = await tx
        .select({
          taskId: workTask.id,
          assignee: workTask.primaryAssigneeId,
          unitName: deliverableUnit.name,
        })
        .from(workTask)
        .innerJoin(deliverableUnit, eq(deliverableUnit.id, input.unitId))
        .where(
          and(
            eq(workTask.id, input.taskId),
            eq(workTask.organizationId, actor.organizationId),
            eq(deliverableUnit.organizationId, actor.organizationId),
            eq(deliverableUnit.enabled, true),
          ),
        )
        .limit(1);
      if (!refs) throw new BusinessError("任务或交付物单位无效", 404);
      if (actor.role !== "BOSS" && actor.id !== refs.assignee)
        throw new BusinessError("只能为自己负责的任务添加交付物", 403);
      const [existing] = await tx
        .select({ id: deliverable.id })
        .from(deliverable)
        .where(
          and(
            eq(deliverable.taskId, input.taskId),
            eq(deliverable.unitId, input.unitId),
          ),
        )
        .limit(1);
      const values = {
        quantity: String(input.quantity),
        unitName: refs.unitName,
        updatedAt: new Date(),
      };
      let id = existing?.id;
      if (existing)
        await tx
          .update(deliverable)
          .set(values)
          .where(eq(deliverable.id, existing.id));
      else {
        id = crypto.randomUUID();
        await tx
          .insert(deliverable)
          .values({
            id,
            organizationId: actor.organizationId,
            taskId: input.taskId,
            unitId: input.unitId,
            ...values,
          });
      }
      await tx
        .insert(auditLog)
        .values({
          id: crypto.randomUUID(),
          organizationId: actor.organizationId,
          actorId: actor.id,
          action: existing ? "DELIVERABLE_UPDATE" : "DELIVERABLE_CREATE",
          resourceType: "DELIVERABLE",
          resourceId: id,
          result: "SUCCESS",
        });
      return { id, quantity: input.quantity, unitName: refs.unitName };
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
