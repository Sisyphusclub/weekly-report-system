import { and, asc, desc, eq, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { reportingExemption, user } from "@/lib/db/schema";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ExemptionForm } from "@/components/workspace/exemption-form";
import { ButtonLink } from "@/components/motion/button/base";
export const metadata = { title: "请假与免报" };
export default async function ExemptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await requireUser();
  if (actor.role !== "ADMIN") notFound();
  const params = await searchParams;
  const n = Number(params.page ?? 1);
  const page = Number.isSafeInteger(n) && n > 0 ? Math.min(n, 100000) : 1;
  const db = getDb();
  const [people, rows] = await Promise.all([
    db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(
        and(
          eq(user.organizationId, actor.organizationId),
          eq(user.status, "ACTIVE"),
          ne(user.role, "ADMIN"),
        ),
      )
      .orderBy(asc(user.name)),
    db
      .select({ item: reportingExemption, name: user.name })
      .from(reportingExemption)
      .innerJoin(
        user,
        and(
          eq(user.id, reportingExemption.userId),
          eq(user.organizationId, actor.organizationId),
        ),
      )
      .where(eq(reportingExemption.organizationId, actor.organizationId))
      .orderBy(desc(reportingExemption.createdAt), desc(reportingExemption.id))
      .limit(21)
      .offset((page - 1) * 20),
  ]);
  return (
    <WorkspaceShell actor={actor} selected="exemptions">
      <h1 className="text-2xl font-medium leading-8">请假与免报</h1>
      <ExemptionForm people={people} />
      <section aria-label="免报记录" className="flex flex-col gap-3">
        <h2 className="text-xl font-medium leading-7">登记记录</h2>
        {rows.length ? (
          <ul className="divide-y divide-separator-border">
            {rows.slice(0, 20).map(({ item, name }) => (
              <li key={item.id} className="flex flex-col gap-2 py-4">
                <p>
                  {name} · {item.startDate} 至 {item.endDate}
                </p>
                <p className="break-words text-sm font-normal leading-5 text-slate-500">
                  {item.reason}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p>暂无免报记录</p>
        )}
      </section>
      <nav
        aria-label="免报记录分页"
        className="flex flex-wrap items-center gap-3"
      >
        {page > 1 && (
          <ButtonLink
            href={`/admin/exemptions?page=${page - 1}`}
            variant="secondary"
          >
            上一页
          </ButtonLink>
        )}
        <span>第 {page} 页</span>
        {rows.length > 20 && (
          <ButtonLink
            href={`/admin/exemptions?page=${page + 1}`}
            variant="secondary"
          >
            下一页
          </ButtonLink>
        )}
      </nav>
    </WorkspaceShell>
  );
}
