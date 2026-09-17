import { and, asc, desc, eq, ne, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import {
  category,
  project,
  user,
  workTask,
  deliverable,
  deliverableUnit,
  externalLink,
} from "@/lib/db/schema";
import { DeliverableForm } from "@/components/workspace/deliverable-form";
import { WorkspaceShell } from "@/components/workspace/shell";
import { TaskForm } from "@/components/workspace/task-form";
import { RollPlanForm } from "@/components/workspace/roll-plan-form";
import { TaskStatusForm } from "@/components/workspace/task-status-form";
import { ButtonLink } from "@/components/base/buttons/button";
import { ExternalLinkForm } from "@/components/workspace/external-link-form";
import { TaskImportForm } from "@/components/workspace/task-import-form";
import { TaskCommentSection } from "@/components/workspace/task-comment-section";
export const metadata = { title: "任务管理" };
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; project?: string }>;
}) {
  const actor = await requireUser();
  if (actor.role === "ADMIN") notFound();
  const params = await searchParams;
  const requestedPage = Number(params.page ?? 1);
  const projectFilter = params.project;
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, 50000)
      : 1;
  const db = getDb();
  const [projects, categories, people, tasks, units] = await Promise.all([
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
        projectId: workTask.projectId,
        categoryId: workTask.categoryId,
        primaryAssigneeId: workTask.primaryAssigneeId,
        workDate: workTask.workDate,
        sourceTaskId: workTask.sourceTaskId,
      })
      .from(workTask)
      .where(
        and(
          eq(workTask.organizationId, actor.organizationId),
          actor.role === "EMPLOYEE"
            ? eq(workTask.primaryAssigneeId, actor.id)
            : undefined,
          projectFilter ? eq(workTask.projectId, projectFilter) : undefined,
        ),
      )
      .orderBy(desc(workTask.updatedAt), desc(workTask.id))
      .limit(21)
      .offset((page - 1) * 20),
    db
      .select({ id: deliverableUnit.id, name: deliverableUnit.name })
      .from(deliverableUnit)
      .where(
        and(
          eq(deliverableUnit.organizationId, actor.organizationId),
          eq(deliverableUnit.enabled, true),
        ),
      )
      .orderBy(asc(deliverableUnit.sortOrder), asc(deliverableUnit.name)),
  ]);
  const links = tasks.length
    ? await db
        .select({
          taskId: externalLink.taskId,
          id: externalLink.id,
          title: externalLink.title,
          url: externalLink.url,
        })
        .from(externalLink)
        .where(
          and(
            eq(externalLink.organizationId, actor.organizationId),
            inArray(
              externalLink.taskId,
              tasks.slice(0, 20).map((task) => task.id),
            ),
          ),
        )
    : [];
  const deliveries = tasks.length
    ? await db
        .select({
          taskId: deliverable.taskId,
          unitId: deliverable.unitId,
          unitName: deliverable.unitName,
          quantity: deliverable.quantity,
        })
        .from(deliverable)
        .where(
          and(
            eq(deliverable.organizationId, actor.organizationId),
            inArray(
              deliverable.taskId,
              tasks.slice(0, 20).map((task) => task.id),
            ),
          ),
        )
        .orderBy(asc(deliverable.unitName))
    : [];
  return (
    <WorkspaceShell actor={actor} selected="tasks">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title-1-medium">任务管理</h1>
        <ButtonLink href="/api/tasks/export" variant="secondary" download>
          导出任务 JSON
        </ButtonLink>
      </div>
      <TaskForm
        projects={projects}
        categories={categories}
        people={people}
        selfId={actor.id}
      />
      <TaskImportForm />
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
              <details className="w-full">
                <summary className="cursor-pointer text-body-medium">
                  编辑任务
                </summary>
                <TaskForm
                  projects={projects}
                  categories={categories}
                  people={people}
                  selfId={actor.id}
                  initial={task}
                />
              </details>
              <TaskCommentSection taskId={task.id} actorId={actor.id} />
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
              <DeliverableForm
                key={`deliverables:${task.id}:${task.version}`}
                taskId={task.id}
                version={task.version}
                units={units}
                items={deliveries.filter((item) => item.taskId === task.id)}
              />
              <details className="w-full">
                <summary className="cursor-pointer text-body-medium">
                  外部交付链接
                  {links.filter((link) => link.taskId === task.id).length
                    ? `（${links.filter((link) => link.taskId === task.id).length}）`
                    : ""}
                </summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {links
                    .filter((link) => link.taskId === task.id)
                    .map((link) => (
                      <li key={link.id}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline"
                        >
                          {link.title}
                        </a>
                      </li>
                    ))}
                </ul>
                <ExternalLinkForm taskId={task.id} />
              </details>
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
