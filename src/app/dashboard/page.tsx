import { and, count, eq } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { project, user, category, deliverableUnit } from "@/lib/db/schema";
import { listReports } from "@/lib/reports";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ButtonLink } from "@/components/base/buttons/button";
import { getDashboardMetrics, submissionRate } from "@/lib/metrics";

export const metadata = { title: "工作看板" };
export default async function DashboardPage() {
  const actor = await requireUser();
  const db = getDb();
  if (actor.role === "ADMIN") {
    const counts = await Promise.all([
      db
        .select({ value: count() })
        .from(user)
        .where(eq(user.organizationId, actor.organizationId)),
      db
        .select({ value: count() })
        .from(project)
        .where(eq(project.organizationId, actor.organizationId)),
      db
        .select({ value: count() })
        .from(category)
        .where(
          and(
            eq(category.organizationId, actor.organizationId),
            eq(category.enabled, true),
          ),
        ),
      db
        .select({ value: count() })
        .from(deliverableUnit)
        .where(
          and(
            eq(deliverableUnit.organizationId, actor.organizationId),
            eq(deliverableUnit.enabled, true),
          ),
        ),
    ]);
    return (
      <WorkspaceShell actor={actor} selected="dashboard">
        <header>
          <h1 className="text-title-1-medium">系统概览</h1>
          <p className="mt-2 text-body-regular text-text-secondary">
            管理员工作空间 · 账号与基础资料
          </p>
        </header>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {["账号", "项目", "启用分类", "启用交付物单位"].map((label, i) => (
            <section
              key={label}
              className="rounded-3xl border border-border-button-default p-6"
            >
              <h2 className="text-body-regular text-text-secondary">{label}</h2>
              <p className="mt-3 text-title-1-medium">{counts[i][0].value}</p>
            </section>
          ))}
        </div>
      </WorkspaceShell>
    );
  }
  const reports = await listReports(actor, "", 1);
  const metrics = await getDashboardMetrics(actor);
  return (
    <WorkspaceShell actor={actor} selected="dashboard">
      <header>
        <p className="mb-2 text-caption-1-medium text-text-tertiary">
          团队协作空间
        </p>
        <h1 className="text-title-1-medium">工作看板</h1>
        <p className="mt-2 text-body-regular text-text-secondary">
          从工作记录中了解团队进展。
        </p>
      </header>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          [
            "本周按时提交率",
            submissionRate(metrics.onTimeReports, metrics.dueReports) === null
              ? "暂无数据"
              : `${submissionRate(metrics.onTimeReports, metrics.dueReports)}%`,
          ],
          ["待处理阻塞", String(metrics.openBlockers)],
          ["紧急阻塞", String(metrics.urgentBlockers)],
          ["本周完成任务", String(metrics.completedTasks)],
        ].map(([label, value]) => (
          <section
            key={label}
            className="rounded-3xl border border-border-button-default p-5"
          >
            <p className="text-body-regular text-text-secondary">{label}</p>
            <p className="mt-2 text-title-2-medium">{value}</p>
          </section>
        ))}
      </div>
      <p className="text-body-regular text-text-secondary">
        按当前有效成员本周已到截止时间的日报统计，扣除休息日和免报日期。
      </p>
      <section className="rounded-3xl border border-border-button-default p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-title-2-medium">最近报告</h2>
          <ButtonLink href="/reports" variant="secondary">
            查看全部
          </ButtonLink>
        </div>
        {reports.items.length ? (
          <ul className="mt-5 divide-y divide-separator-border">
            {reports.items.slice(0, 6).map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="text-body-medium">
                    {item.author} · {item.type === "DAILY" ? "日报" : "周报"} ·{" "}
                    {item.date ?? item.weekStart}
                  </p>
                  <p className="mt-1 text-body-regular text-text-secondary">
                    {item.summary || "未填写总结"}
                  </p>
                </div>
                <ButtonLink href={`/reports/${item.id}`} variant="ghost">
                  查看报告
                </ButtonLink>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-12 text-center">
            <p className="text-headline-medium">还没有可查看的报告</p>
            <p className="mt-2 text-body-regular text-text-secondary">
              团队已提交的报告会出现在这里，草稿仅本人可见。
            </p>
          </div>
        )}
      </section>
    </WorkspaceShell>
  );
}
