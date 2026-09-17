import { and, eq } from "drizzle-orm";
import { taskInput } from "@/lib/task-input";
import { writeActor, BusinessError, apiError } from "@/lib/api";
import { getDb } from "@/lib/db";
import { auditLog, category, project, user, workTask } from "@/lib/db/schema";
export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    const parsed = taskInput.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new BusinessError("任务内容、日期或版本无效");
    const input = parsed.data;
    if (
      input.id &&
      actor.role !== "BOSS" &&
      input.primaryAssigneeId !== actor.id
    )
      throw new BusinessError("只能修改自己的任务", 403);
    const result = await getDb().transaction(async (tx) => {
      const [refs] = await tx
        .select({
          projectId: project.id,
          categoryId: category.id,
          categoryName: category.name,
          assigneeId: user.id,
        })
        .from(project)
        .innerJoin(category, eq(category.organizationId, actor.organizationId))
        .innerJoin(user, eq(user.id, input.primaryAssigneeId))
        .where(
          and(
            eq(project.id, input.projectId),
            eq(project.organizationId, actor.organizationId),
            eq(category.id, input.categoryId),
            eq(category.enabled, true),
            eq(user.organizationId, actor.organizationId),
            eq(user.status, "ACTIVE"),
          ),
        )
        .limit(1);
      if (!refs) throw new BusinessError("项目、分类或负责人无效");
      const id = input.id ?? crypto.randomUUID();
      const values = {
        projectId: input.projectId,
        categoryId: input.categoryId,
        categoryName: refs.categoryName,
        primaryAssigneeId: input.primaryAssigneeId,
        content: input.content,
        kind: input.kind,
        status: input.status,
        workDate: input.workDate,
        dueDate: input.dueDate,
        sourceTaskId: input.sourceTaskId,
        version: input.version + 1,
        updatedAt: new Date(),
      };
      if (input.id) {
        const changed = await tx
          .update(workTask)
          .set(values)
          .where(
            and(
              eq(workTask.id, id),
              eq(workTask.organizationId, actor.organizationId),
              eq(workTask.version, input.version),
            ),
          )
          .returning({ id: workTask.id });
        if (!changed.length)
          throw new BusinessError("任务已被更新，请刷新后重试", 409);
      } else
        await tx
          .insert(workTask)
          .values({
            id,
            organizationId: actor.organizationId,
            createdById: actor.id,
            ...values,
          });
      await tx
        .insert(auditLog)
        .values({
          id: crypto.randomUUID(),
          organizationId: actor.organizationId,
          actorId: actor.id,
          action: input.id ? "TASK_UPDATE" : "TASK_CREATE",
          resourceType: "TASK",
          resourceId: id,
          result: "SUCCESS",
        });
      return { id, version: values.version };
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
