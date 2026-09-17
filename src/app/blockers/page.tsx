import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { blocker, user, project } from "@/lib/db/schema";
import { blockerVisibility } from "@/lib/blockers";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ButtonLink } from "@/components/base/buttons/button";
import { BlockerForm } from "@/components/workspace/blocker-form";

const severityLabel = {
  NORMAL: "一般",
  IMPORTANT: "重要",
  URGENT: "紧急",
} as const;
const statusLabel = {
  OPEN: "待处理",
  ACKNOWLEDGED: "已接收",
  RESOLVED: "已解决",
} as const;

export const metadata = { title: "阻塞中心" };
export default async function BlockersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.min(
    100000,
    Math.max(
      1,
      Number.isSafeInteger(Number(params.page)) ? Number(params.page) : 1,
    ),
  );
  const actor = await requireUser();
  if (actor.role === "ADMIN") notFound();
  const rows = await getDb()
    .select({ item: blocker, reporter: user.name, project: project.name })
    .from(blocker)
    .innerJoin(user, eq(blocker.reporterId, user.id))
    .leftJoin(project, eq(blocker.projectId, project.id))
    .where(blockerVisibility(actor))
    .orderBy(desc(blocker.createdAt), desc(blocker.id))
    .limit(21)
    .offset((page - 1) * 20);
  const visible = rows.slice(0, 20);
  return (
    <WorkspaceShell actor={actor} selected="blockers">
      <header>
        <h1 className="text-title-1-medium">阻塞中心</h1>
        <p className="mt-2 text-body-regular text-text-secondary">
          集中查看需要协调的事项，敏感内容只向相关人员展示。
        </p>
      </header>
      <BlockerForm />
      <section className="rounded-3xl border border-border-button-default p-6">
        {visible.length ? (
          <ul className="divide-y divide-separator-border">
            {visible.map(({ item, reporter, project: projectName }) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-4 py-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-headline-medium">
                      {severityLabel[item.severity]}
                    </span>
                    <span className="text-body-regular text-text-secondary">
                      {statusLabel[item.status]}
                    </span>
                    {item.isSensitive && (
                      <span className="text-body-regular text-text-secondary">
                        敏感
                      </span>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words">
                    {item.description}
                  </p>
                  <p className="mt-2 text-body-regular text-text-secondary">
                    提出人：{reporter}
                    {projectName ? ` · 项目：${projectName}` : ""}
                  </p>
                  {item.resolution && (
                    <p className="mt-2 text-body-regular text-text-secondary">
                      处理说明：{item.resolution}
                    </p>
                  )}
                </div>
                {
                  <ButtonLink href={`/blockers/${item.id}`} variant="secondary">
                    查看详情
                  </ButtonLink>
                }
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-12 text-center">
            <p className="text-headline-medium">暂无可见阻塞</p>
            <p className="mt-2 text-body-regular text-text-secondary">
              新的协调事项会显示在这里。
            </p>
          </div>
        )}
      </section>
      <footer className="flex gap-3">
        {page > 1 && (
          <ButtonLink href={`/blockers?page=${page - 1}`} variant="secondary">
            上一页
          </ButtonLink>
        )}
        <span>第 {page} 页</span>
        {rows.length > 20 && (
          <ButtonLink href={`/blockers?page=${page + 1}`} variant="secondary">
            下一页
          </ButtonLink>
        )}
      </footer>
    </WorkspaceShell>
  );
}
