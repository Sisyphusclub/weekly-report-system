import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { blocker, user, project } from "@/lib/db/schema";
import { blockerVisibility } from "@/lib/blockers";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ButtonLink } from "@/components/motion/button/base";
import { Badge } from "@/components/premium/badge";
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
const severityTone = {
  NORMAL: "neutral",
  IMPORTANT: "warning",
  URGENT: "danger",
} as const;
const statusTone = {
  OPEN: "warning",
  ACKNOWLEDGED: "info",
  RESOLVED: "success",
} as const;

export const metadata = { title: "阻塞中心" };
export default async function BlockersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; severity?: string }>;
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
  const status =
    params.status === "resolved"
      ? "resolved"
      : params.status === "all"
        ? "all"
        : "active";
  const severity = ["NORMAL", "IMPORTANT", "URGENT"].includes(
    params.severity ?? "",
  )
    ? (params.severity as "NORMAL" | "IMPORTANT" | "URGENT")
    : undefined;
  const coordinator = alias(user, "coordinator");
  const rows = await getDb()
    .select({
      item: blocker,
      reporter: user.name,
      project: project.name,
      coordinatorName: coordinator.name,
    })
    .from(blocker)
    .innerJoin(
      user,
      and(
        eq(blocker.reporterId, user.id),
        eq(blocker.organizationId, user.organizationId),
      ),
    )
    .leftJoin(
      project,
      and(
        eq(blocker.projectId, project.id),
        eq(blocker.organizationId, project.organizationId),
      ),
    )
    .leftJoin(
      coordinator,
      and(
        eq(coordinator.id, blocker.coordinatorId),
        eq(coordinator.organizationId, actor.organizationId),
      ),
    )
    .where(
      and(
        blockerVisibility(actor),
        status === "active"
          ? ne(blocker.status, "RESOLVED")
          : status === "resolved"
            ? eq(blocker.status, "RESOLVED")
            : undefined,
        severity ? eq(blocker.severity, severity) : undefined,
      ),
    )
    .orderBy(
      asc(sql`case when ${blocker.status} = 'RESOLVED' then 1 else 0 end`),
      asc(
        sql`case ${blocker.severity} when 'URGENT' then 0 when 'IMPORTANT' then 1 else 2 end`,
      ),
      desc(blocker.createdAt),
      desc(blocker.id),
    )
    .limit(21)
    .offset((page - 1) * 20);
  const visible = rows.slice(0, 20);
  return (
    <WorkspaceShell actor={actor} selected="blockers">
      <header>
        <h1 className="text-2xl font-medium leading-8">阻塞中心</h1>
        <p className="mt-2 text-sm font-normal leading-5 text-muted-foreground">
          {actor.role === "BOSS"
            ? "查看团队阻塞情况，事项由提出人和项目协作方跟进。"
            : "集中查看需要协调的事项，敏感内容只向相关人员展示。"}
        </p>
      </header>
      {actor.role === "EMPLOYEE" ? <BlockerForm /> : null}
      <nav aria-label="阻塞筛选" className="flex flex-wrap gap-3">
        {(
          [
            { value: "active", label: "待处理" },
            { value: "resolved", label: "已解决" },
            { value: "all", label: "全部" },
          ] as const
        ).map((item) => (
          <ButtonLink
            key={item.value}
            href={`/blockers?status=${item.value}${severity ? `&severity=${severity}` : ""}`}
            variant={status === item.value ? "secondary" : "ghost"}
            aria-current={status === item.value ? "page" : undefined}
          >
            {item.label}
          </ButtonLink>
        ))}
        {(["ALL", "NORMAL", "IMPORTANT", "URGENT"] as const).map((value) => (
          <ButtonLink
            key={value}
            href={`/blockers?status=${status}${value === "ALL" ? "" : `&severity=${value}`}`}
            variant={
              (value === "ALL" ? !severity : severity === value)
                ? "secondary"
                : "ghost"
            }
          >
            {value === "ALL" ? "全部级别" : severityLabel[value]}
          </ButtonLink>
        ))}
      </nav>
      <section className="rounded-xl border border-border bg-card p-6">
        {visible.length ? (
          <ul className="divide-y divide-separator-border">
            {visible.map(
              ({ item, reporter, project: projectName, coordinatorName }) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-4 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color={severityTone[item.severity]}>
                        {severityLabel[item.severity]}
                      </Badge>
                      <Badge color={statusTone[item.status]}>
                        {statusLabel[item.status]}
                      </Badge>
                      {item.isSensitive && (
                        <Badge color="neutral">敏感内容</Badge>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words">
                      {item.description}
                    </p>
                    <p className="mt-2 text-sm font-normal leading-5 text-muted-foreground">
                      提出人：{reporter}
                      {coordinatorName ? ` · 协同人：${coordinatorName}` : ""}
                      {projectName ? ` · 项目：${projectName}` : ""}
                    </p>
                    {item.resolution && (
                      <p className="mt-2 text-sm font-normal leading-5 text-muted-foreground">
                        处理说明：{item.resolution}
                      </p>
                    )}
                  </div>
                  {
                    <ButtonLink
                      href={`/blockers/${item.id}`}
                      variant="secondary"
                    >
                      查看详情
                    </ButtonLink>
                  }
                </li>
              ),
            )}
          </ul>
        ) : (
          <div className="py-12 text-center">
            <p className="text-base font-medium leading-6">暂无可见阻塞</p>
            <p className="mt-2 text-sm font-normal leading-5 text-muted-foreground">
              新的阻塞记录会显示在这里。
            </p>
          </div>
        )}
      </section>
      <footer className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {page > 1 && (
          <ButtonLink
            href={`/blockers?status=${status}${severity ? `&severity=${severity}` : ""}&page=${page - 1}`}
            variant="secondary"
          >
            上一页
          </ButtonLink>
        )}
        <span>第 {page} 页</span>
        {rows.length > 20 && (
          <ButtonLink
            href={`/blockers?status=${status}${severity ? `&severity=${severity}` : ""}&page=${page + 1}`}
            variant="secondary"
          >
            下一页
          </ButtonLink>
        )}
      </footer>
    </WorkspaceShell>
  );
}
