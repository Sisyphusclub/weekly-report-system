import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ButtonLink } from "@/components/base/buttons/button";
import { TaskImportForm } from "@/components/workspace/task-import-form";

export const metadata = { title: "任务数据" };
export default async function AdminTasksPage() {
  const actor = await requireUser();
  if (actor.role !== "ADMIN") notFound();
  return (
    <WorkspaceShell actor={actor} selected="tasks">
      <h1 className="text-title-1-medium">任务数据</h1>
      <p className="text-body-regular text-text-secondary">
        管理员可导入或导出组织任务数据。
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
    </WorkspaceShell>
  );
}
