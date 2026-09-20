import { and, asc, desc, eq, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { project, projectMember, user } from "@/lib/db/schema";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ProjectForm } from "@/components/workspace/project-form";
import { ButtonLink } from "@/components/motion/button/base";
export const metadata = { title: "项目管理" };
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; page?: string }>;
}) {
  const actor = await requireUser();
  if (actor.role !== "ADMIN") notFound();
  const params = await searchParams;
  const n = Number(params.page);
  const page = Number.isSafeInteger(n) && n > 0 ? Math.min(n, 100000) : 1;
  const db = getDb();
  const people = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(
      and(
        eq(user.organizationId, actor.organizationId),
        eq(user.status, "ACTIVE"),
        ne(user.role, "ADMIN"),
      ),
    )
    .orderBy(asc(user.name))
    .limit(101);
  const rows = await db
    .select()
    .from(project)
    .where(eq(project.organizationId, actor.organizationId))
    .orderBy(desc(project.createdAt), desc(project.id))
    .limit(21)
    .offset((page - 1) * 20);
  const [editing] = params.edit
    ? await db
        .select()
        .from(project)
        .where(
          and(
            eq(project.organizationId, actor.organizationId),
            eq(project.id, params.edit),
          ),
        )
        .limit(1)
    : [];
  if (params.edit && !editing) notFound();
  const members = editing
    ? await db
        .select({ id: projectMember.userId })
        .from(projectMember)
        .where(
          and(
            eq(projectMember.organizationId, actor.organizationId),
            eq(projectMember.projectId, editing.id),
          ),
        )
    : [];
  return (
    <WorkspaceShell actor={actor} selected="projects">
      <h1 className="text-title-1-medium">项目管理</h1>
      {editing && (
        <ButtonLink href="/admin/projects" variant="secondary">
          创建新项目
        </ButtonLink>
      )}
      <ProjectForm
        key={editing ? `${editing.id}:${editing.version}` : "new"}
        people={people}
        item={
          editing
            ? { ...editing, memberIds: members.map((member) => member.id) }
            : undefined
        }
      />
      <section aria-label="项目列表" className="flex flex-col gap-4">
        {rows.slice(0, 20).map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-4 rounded-3xl border border-border-button-default p-4"
          >
            <span>
              {row.name} ·{" "}
              {
                {
                  PLANNED: "计划中",
                  ACTIVE: "进行中",
                  ON_HOLD: "暂停",
                  COMPLETED: "完成",
                  ARCHIVED: "归档",
                }[row.status]
              }
            </span>
            <ButtonLink
              href={`?edit=${row.id}&page=${page}`}
              variant="secondary"
            >
              编辑
            </ButtonLink>
          </div>
        ))}
      </section>
      <footer className="flex gap-3">
        {page > 1 && (
          <ButtonLink href={`?page=${page - 1}`} variant="secondary">
            上一页
          </ButtonLink>
        )}
        <span>第 {page} 页</span>
        {rows.length > 20 && (
          <ButtonLink href={`?page=${page + 1}`} variant="secondary">
            下一页
          </ButtonLink>
        )}
      </footer>
    </WorkspaceShell>
  );
}

