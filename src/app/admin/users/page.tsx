import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { WorkspaceShell } from "@/components/workspace/shell";
import { CreateUserForm } from "@/components/workspace/create-user-form";
import { ButtonLink } from "@/components/base/buttons/button";
import { UserStatusButton } from "@/components/workspace/user-status-button";
import { ResetPasswordButton } from "@/components/workspace/reset-password-button";
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
      <h1 className="text-title-1-medium">账号管理</h1>
      <CreateUserForm />
      <section
        aria-label="账号列表"
        className="rounded-3xl border border-border-button-default p-6"
      >
        <ul className="divide-y divide-separator-border">
          {rows.slice(0, 20).map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-4 py-4"
            >
              <p className="text-headline-medium">
                {row.name} · {row.username}
              </p>
              <div className="flex flex-wrap gap-2">
                <UserStatusButton id={row.id} status={row.status} />
                <ResetPasswordButton id={row.id} username={row.username} />
              </div>
              <p className="mt-2 text-body-regular text-text-secondary">
                {{ EMPLOYEE: "员工", BOSS: "老板", ADMIN: "管理员" }[row.role]}{" "}
                ·{" "}
                {
                  {
                    PENDING: "待首次登录设置",
                    ACTIVE: "正常",
                    LOCKED: "锁定",
                    DISABLED: "停用",
                  }[row.status]
                }
                {row.title ? ` · ${row.title}` : ""}
              </p>
            </li>
          ))}
        </ul>
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
