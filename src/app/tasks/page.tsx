import { and, asc, desc, eq, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { category, project, user, workTask } from "@/lib/db/schema";
import { WorkspaceShell } from "@/components/workspace/shell";
import { TaskForm } from "@/components/workspace/task-form";
import { RollPlanForm } from "@/components/workspace/roll-plan-form";
import { TaskStatusForm } from "@/components/workspace/task-status-form";
import { ButtonLink } from "@/components/base/buttons/button";
export const metadata = { title: "任务管理" };
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await requireUser();
  if (actor.role === "ADMIN") notFound();
  const params = await searchParams;
  const requestedPage = Number(params.page ?? 1);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, 50000)
      : 1;
  const db = getDb();
  const [projects, categories, people, tasks] = await Promise.all([
    db
      .select({ id: project.id, name: project.name })
      .from(project)
      .where(
        and(
          eq(project.organizationId, actor.organizationId),
          ne(project.status, "ARCHIVED"),
        ),
      )
      .orderBy(asc(project.name)),
    db
      .select({ id: category.id, name: category.name })
      .from(category)
      .where(
        and(
          eq(category.organizationId, actor.organizationId),
          eq(category.enabled, true),
        ),
      )
      .orderBy(asc(category.sortOrder), asc(category.name)),
    db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(
        and(
          eq(user.organizationId, actor.organizationId),
          eq(user.status, "ACTIVE"),
          ne(user.role, "ADMIN"),
          actor.role === "EMPLOYEE" ? eq(user.id, actor.id) : undefined,
        ),
      )
      .orderBy(asc(user.name)),
    db
      .select({
        id: workTask.id,
        version: workTask.version,
        content: workTask.content,
        kind: workTask.kind,
        status: workTask.status,
        dueDate: workTask.dueDate,
        categoryName: workTask.categoryName,
      })
      .from(workTask)
      .where(
        and(
          eq(workTask.organizationId, actor.organizationId),
          actor.role === "EMPLOYEE"
            ? eq(workTask.primaryAssigneeId, actor.id)
            : undefined,
        ),
      )
      .orderBy(desc(workTask.updatedAt), desc(workTask.id))
      .limit(21)
      .offset((page - 1) * 20),
  ]);
  return (
    <WorkspaceShell actor={actor} selected="tasks">
      <h1 className="text-title-1-medium">任务管理</h1>
      <TaskForm
        projects={projects}
        categories={categories}
        people={people}
        selfId={actor.id}
      />
      <section className="flex flex-col gap-3" aria-label="任务列表">
        <h2 className="text-title-2-medium">最近任务</h2>
        {tasks.length === 0 ? (
          <p>暂无任务</p>
        ) : (
          tasks.slice(0, 20).map((task) => (
            <div
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-button-default p-4"
            >
              <span className="min-w-0 break-words">{task.content}</span>
              <TaskStatusForm
                key={`${task.id}:${task.version}`}
                taskId={task.id}
                version={task.version}
                status={task.status}
              />
              <span className="text-body-regular text-text-secondary">
                {task.kind === "PLAN" ? "计划" : "实际"} · {task.categoryName} ·{" "}
                {
                  {
                    TODO: "待开始",
                    IN_PROGRESS: "进行中",
                    BLOCKED: "阻塞",
                    DONE: "完成",
                    CANCELED: "已取消",
                  }[task.status]
                }
                {task.dueDate ? ` · ${task.dueDate}` : ""}
              </span>
              {task.kind === "PLAN" &&
                task.dueDate &&
                task.status !== "DONE" &&
                task.status !== "CANCELED" && (
                  <RollPlanForm
                    taskId={task.id}
                    version={task.version}
                    dueDate={task.dueDate}
                  />
                )}
            </div>
          ))
        )}
      </section>
      <nav aria-label="任务分页" className="flex flex-wrap items-center gap-3">
        {page > 1 && (
          <ButtonLink href={`/tasks?page=${page - 1}`} variant="secondary">
            上一页
          </ButtonLink>
        )}
        <span>第 {page} 页</span>
        {tasks.length > 20 && (
          <ButtonLink href={`/tasks?page=${page + 1}`} variant="secondary">
            下一页
          </ButtonLink>
        )}
      </nav>
    </WorkspaceShell>
  );
}
