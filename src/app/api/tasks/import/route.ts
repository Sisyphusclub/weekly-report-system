import { and, eq, ne } from "drizzle-orm";
import { writeActor, BusinessError, apiError } from "@/lib/api";
import { taskImportBatch } from "@/lib/task-import-input";
import { getDb } from "@/lib/db";
import { auditLog, category, project, user, workTask } from "@/lib/db/schema";
export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role === "ADMIN")
      throw new BusinessError("管理员不能导入业务任务", 403);
    const parsed = taskImportBatch.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) throw new BusinessError("导入任务格式无效");
    const result = await getDb().transaction(async (tx) => {
      const created: string[] = [];
      for (const item of parsed.data.items) {
        if (actor.role !== "BOSS" && item.primaryAssigneeId !== actor.id)
          throw new BusinessError("只能导入自己的任务", 403);
        if (item.kind === "ACTUAL" && !item.workDate)
          throw new BusinessError("实际任务必须填写工作日期");
        if (item.kind === "PLAN" && !item.dueDate)
          throw new BusinessError("计划必须填写截止日期");
        const [refs] = await tx
          .select({ categoryName: category.name })
          .from(project)
          .innerJoin(category, eq(category.id, item.categoryId))
          .innerJoin(user, eq(user.id, item.primaryAssigneeId))
          .where(
            and(
              eq(project.id, item.projectId),
              eq(project.organizationId, actor.organizationId),
              ne(project.status, "ARCHIVED"),
              eq(category.organizationId, actor.organizationId),
              eq(category.enabled, true),
              eq(user.organizationId, actor.organizationId),
              eq(user.status, "ACTIVE"),
              ne(user.role, "ADMIN"),
            ),
          )
          .limit(1);
        if (!refs) throw new BusinessError("项目、分类或负责人无效");
        const id = crypto.randomUUID();
        await tx
          .insert(workTask)
          .values({
            id,
            organizationId: actor.organizationId,
            projectId: item.projectId,
            categoryId: item.categoryId,
            categoryName: refs.categoryName,
            primaryAssigneeId: item.primaryAssigneeId,
            content: item.content,
            kind: item.kind,
            status: item.status,
            workDate: item.workDate,
            dueDate: item.dueDate,
            version: 1,
            sourceTaskId: null,
          });
        created.push(id);
      }
      await tx
        .insert(auditLog)
        .values({
          id: crypto.randomUUID(),
          organizationId: actor.organizationId,
          actorId: actor.id,
          action: "TASK_IMPORT",
          resourceType: "TASK",
          resourceId: created[0],
          result: "SUCCESS",
        });
      return { created: created.length, ids: created };
    });
    return Response.json(result, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
