import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { getDb } from "@/lib/db";
import {
  auditLog,
  category,
  deliverable,
  deliverableUnit,
  project,
  projectMember,
  taskStatusHistory,
  workTask,
} from "@/lib/db/schema";
import { shanghaiDate } from "@/lib/daily-input";

const inputSchema = z.object({
  projectId: z.string().min(1),
  categoryId: z.string().min(1),
  content: z.string().trim().min(1).max(5000),
  deliverables: z
    .array(
      z.object({
        unitId: z.string().min(1),
        quantity: z.number().finite().min(0).max(1_000_000_000).multipleOf(0.0001),
      }),
    )
    .max(20)
    .default([]),
}).superRefine((value, ctx) => {
  const unitIds = value.deliverables.map((item) => item.unitId);
  if (new Set(unitIds).size !== unitIds.length) {
    ctx.addIssue({
      code: "custom",
      path: ["deliverables"],
      message: "同一交付物单位只能填写一次",
    });
  }
});

export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role === "ADMIN") {
      throw new BusinessError("管理员不能创建业务任务", 403);
    }
    const parsed = inputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new BusinessError("临时任务内容或交付物无效");
    const input = parsed.data;
    const unitIds = [...new Set(input.deliverables.map((item) => item.unitId))];

    const result = await getDb().transaction(async (tx) => {
      const [selectedProject] = await tx
        .select({ id: project.id, ownerId: project.ownerId })
        .from(project)
        .where(
          and(
            eq(project.id, input.projectId),
            eq(project.organizationId, actor.organizationId),
            ne(project.status, "ARCHIVED"),
          ),
        )
        .limit(1)
        .for("share");
      if (!selectedProject) throw new BusinessError("项目不存在或已归档", 404);
      if (actor.role === "EMPLOYEE" && selectedProject.ownerId !== actor.id) {
        const [membership] = await tx
          .select({ userId: projectMember.userId })
          .from(projectMember)
          .where(
            and(
              eq(projectMember.organizationId, actor.organizationId),
              eq(projectMember.projectId, selectedProject.id),
              eq(projectMember.userId, actor.id),
            ),
          )
          .limit(1);
        if (!membership) throw new BusinessError("你不是该项目成员", 403);
      }

      const [selectedCategory] = await tx
        .select({ id: category.id, name: category.name })
        .from(category)
        .where(
          and(
            eq(category.id, input.categoryId),
            eq(category.organizationId, actor.organizationId),
            eq(category.enabled, true),
          ),
        )
        .limit(1);
      if (!selectedCategory) throw new BusinessError("分类不可用", 400);

      const units = unitIds.length
        ? await tx
            .select({ id: deliverableUnit.id, name: deliverableUnit.name })
            .from(deliverableUnit)
            .where(
              and(
                eq(deliverableUnit.organizationId, actor.organizationId),
                eq(deliverableUnit.enabled, true),
                inArray(deliverableUnit.id, unitIds),
              ),
            )
        : [];
      if (units.length !== unitIds.length) {
        throw new BusinessError("交付物单位不可用", 400);
      }
      const unitById = new Map(units.map((unit) => [unit.id, unit.name]));
      const id = crypto.randomUUID();
      const workDate = shanghaiDate();

      await tx.insert(workTask).values({
        id,
        organizationId: actor.organizationId,
        createdById: actor.id,
        primaryAssigneeId: actor.id,
        projectId: selectedProject.id,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        content: input.content,
        kind: "ACTUAL",
        status: "DONE",
        workDate,
        dueDate: null,
        sourceTaskId: null,
        version: 1,
      });
      if (input.deliverables.length) {
        await tx.insert(deliverable).values(
          input.deliverables.map((item) => ({
            id: crypto.randomUUID(),
            organizationId: actor.organizationId,
            taskId: id,
            unitId: item.unitId,
            unitName: unitById.get(item.unitId)!,
            quantity: String(item.quantity),
          })),
        );
      }
      await tx.insert(taskStatusHistory).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        taskId: id,
        fromStatus: null,
        toStatus: "DONE",
        changedById: actor.id,
      });
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "TASK_QUICK_CREATE",
        resourceType: "TASK",
        resourceId: id,
        result: "SUCCESS",
      });
      return { id, version: 1, workDate };
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
