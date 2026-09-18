import { and, eq, ne } from "drizzle-orm";
import { taskInput } from "@/lib/task-input";
import { writeActor, BusinessError, apiError } from "@/lib/api";
import { getDb } from "@/lib/db";
import {
  auditLog,
  category,
  project,
  taskStatusHistory,
  user,
  workTask,
} from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { currentUser } from "@/lib/access";
export async function GET(request: Request) {
  try {
    const actor = await currentUser();
    if (!actor) throw new BusinessError("请先登录", 401);
    if (
      actor.mustChangePassword ||
      (actor.role !== "EMPLOYEE" && !actor.twoFactorEnabled)
    )
      throw new BusinessError("请先完成账号安全设置", 403);
    if (actor.role === "ADMIN")
      throw new BusinessError("管理员不能查看业务任务", 403);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 1000000
    )
      throw new BusinessError("分页参数无效");
    const conditions = [eq(workTask.organizationId, actor.organizationId)];
    if (actor.role === "EMPLOYEE")
      conditions.push(eq(workTask.primaryAssigneeId, actor.id));
    const items = await getDb()
      .select({
        id: workTask.id,
        content: workTask.content,
        kind: workTask.kind,
        status: workTask.status,
        projectId: workTask.projectId,
        categoryId: workTask.categoryId,
        categoryName: workTask.categoryName,
        workDate: workTask.workDate,
        dueDate: workTask.dueDate,
        version: workTask.version,
      })
      .from(workTask)
      .where(and(...conditions))
      .orderBy(desc(workTask.updatedAt), desc(workTask.id))
      .limit(limit)
      .offset(offset);
    return Response.json(
      { items, limit, offset },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof BusinessError) return apiError(error);
    console.error("Task query failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "任务加载失败，请稍后重试" },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role === "ADMIN")
      throw new BusinessError("管理员不能修改业务任务", 403);
    const parsed = taskInput.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new BusinessError("任务内容、日期或版本无效");
    const input = parsed.data;
    if (!input.id && input.kind === "PLAN" && input.sourceTaskId)
      throw new BusinessError("请通过滚动计划操作创建后续计划");
    if (actor.role !== "BOSS" && input.primaryAssigneeId !== actor.id)
      throw new BusinessError("只能修改自己的任务", 403);
    const result = await getDb().transaction(async (tx) => {
      if (input.id) {
        const [existing] = await tx
          .select()
          .from(workTask)
          .where(
            and(
              eq(workTask.id, input.id),
              eq(workTask.organizationId, actor.organizationId),
            ),
          )
          .limit(1)
          .for("update");
        if (!existing) throw new BusinessError("任务不存在", 404);
        if (actor.role !== "BOSS" && existing.primaryAssigneeId !== actor.id)
          throw new BusinessError("只能修改自己的任务", 403);
        if (existing.version !== input.version)
          throw new BusinessError("任务已被更新，请刷新后重试", 409);
        if (existing.sourceTaskId !== input.sourceTaskId)
          throw new BusinessError("任务来源不能修改");
        if (
          existing.kind === "PLAN" &&
          (input.kind !== "PLAN" || input.dueDate !== existing.dueDate)
        )
          throw new BusinessError(
            "原计划类型和截止日期不能修改，请创建后续任务",
          );
      }
      if (!input.id && input.sourceTaskId) {
        const [source] = await tx
          .select()
          .from(workTask)
          .where(
            and(
              eq(workTask.id, input.sourceTaskId),
              eq(workTask.organizationId, actor.organizationId),
            ),
          )
          .limit(1)
          .for("share");
        if (
          !source ||
          source.kind !== "PLAN" ||
          (actor.role !== "BOSS" && source.primaryAssigneeId !== actor.id)
        )
          throw new BusinessError("来源计划不存在或无权引用", 403);
      }
      const [refs] = await tx
        .select({
          projectId: project.id,
          categoryId: category.id,
          categoryName: category.name,
          assigneeId: user.id,
        })
        .from(project)
        .innerJoin(category, eq(category.organizationId, actor.organizationId))
        .innerJoin(
          user,
          and(
            eq(user.id, input.primaryAssigneeId),
            eq(user.organizationId, project.organizationId),
          ),
        )
        .where(
          and(
            eq(project.id, input.projectId),
            eq(project.organizationId, actor.organizationId),
            ne(project.status, "ARCHIVED"),
            eq(category.id, input.categoryId),
            eq(category.enabled, true),
            eq(user.organizationId, actor.organizationId),
            eq(user.status, "ACTIVE"),
            ne(user.role, "ADMIN"),
          ),
        )
        .limit(1);
      if (!refs) throw new BusinessError("项目、分类或负责人无效");
      const id = input.id ?? crypto.randomUUID();
      const previous = input.id
        ? (
            await tx
              .select({ status: workTask.status })
              .from(workTask)
              .where(
                and(
                  eq(workTask.id, id),
                  eq(workTask.organizationId, actor.organizationId),
                ),
              )
              .limit(1)
          )[0]
        : undefined;
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
        await tx.insert(workTask).values({
          id,
          organizationId: actor.organizationId,
          createdById: actor.id,
          ...values,
        });
      if (!previous || previous.status !== input.status) {
        await tx.insert(taskStatusHistory).values({
          id: crypto.randomUUID(),
          organizationId: actor.organizationId,
          taskId: id,
          fromStatus: previous?.status ?? null,
          toStatus: input.status,
          changedById: actor.id,
        });
      }
      await tx.insert(auditLog).values({
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
