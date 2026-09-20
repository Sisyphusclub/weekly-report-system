import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { WorkspaceShell } from "@/components/workspace/shell";
import { CreateUserForm } from "@/components/workspace/create-user-form";
import { ButtonLink } from "@/components/motion/button/base";
import { PageHeading } from "@/components/dashboard/page-heading";
import { UserManagementTable } from "@/components/workspace/user-management-table";
export const metadata = { title: "账号管理" };
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await requireUser();
  if (actor.role !== "ADMIN") notFound();
  const params = await searchParams;
  const n = Number(params.page);
  const page = Number.isSafeInteger(n) && n > 0 ? Math.min(n, 100000) : 1;
  const rows = await getDb()
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      status: user.status,
      title: user.title,
    })
    .from(user)
    .where(eq(user.organizationId, actor.organizationId))
    .orderBy(desc(user.createdAt), desc(user.id))
    .limit(21)
    .offset((page - 1) * 20);
  return (
    <WorkspaceShell actor={actor} selected="users">
      <PageHeading
        eyebrow="系统维护"
        title="账号管理"
        description="创建账号、调整使用状态并处理密码重置。"
      />
      <CreateUserForm />
      <UserManagementTable rows={rows.slice(0, 20)} />
      <footer className="flex items-center gap-3 text-sm text-muted-foreground">
        {page > 1 && (
          <ButtonLink href={`?page=${page - 1}`} variant="secondary">
            上一页
          </ButtonLink>
        )}
        <span className="px-1">第 {page} 页</span>
        {rows.length > 20 && (
          <ButtonLink href={`?page=${page + 1}`} variant="secondary">
            下一页
          </ButtonLink>
        )}
      </footer>
    </WorkspaceShell>
  );
}

