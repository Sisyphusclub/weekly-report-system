import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ButtonLink } from "@/components/base/buttons/button";
import { TaskImportForm } from "@/components/workspace/task-import-form";
import { TaskTransferForm } from "@/components/workspace/task-transfer-form";
import { getDb } from "@/lib/db";
import { user, workTask } from "@/lib/db/schema";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

export const metadata = { title: "任务数据" };
export default async function AdminTasksPage() {
  const actor = await requireUser();
  if (actor.role !== "ADMIN") notFound();
  const people = await getDb()
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      status: user.status,
      openCount: sql<number>`count(${workTask.id})`.mapWith(Number),
    })
    .from(user)
    .leftJoin(
      workTask,
      and(
        eq(workTask.organizationId, user.organizationId),
        eq(workTask.primaryAssigneeId, user.id),
        inArray(workTask.status, ["TODO", "IN_PROGRESS", "BLOCKED"]),
      ),
    )
    .where(eq(user.organizationId, actor.organizationId))
    .groupBy(user.id)
    .orderBy(asc(user.name), asc(user.id));
  return (
    <WorkspaceShell actor={actor} selected="tasks">
      <h1 className="text-title-1-medium">任务数据</h1>
      <p className="text-body-regular text-text-secondary">
        任务导入、导出与人员交接。
      </p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/api/tasks/export" variant="secondary" download>
          导出 JSON
        </ButtonLink>
        <ButtonLink
          href="/api/tasks/export?format=xlsx"
          variant="secondary"
          download
        >
          导出 Excel
        </ButtonLink>
      </div>
      <TaskImportForm />
      <TaskTransferForm people={people} />
    </WorkspaceShell>
  );
}
