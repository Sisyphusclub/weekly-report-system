import { and, desc, eq, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { revisionRequest, user } from "@/lib/db/schema";
import type { Actor } from "@/lib/domain";
import { ButtonLink } from "@/components/motion/button/base";
import { RevisionReviewForm } from "./revision-review-form";

export async function RevisionRequests({
  actor,
  reportId,
  authorId,
  reportVersion,
  page,
}: {
  actor: Actor;
  reportId: string;
  authorId: string;
  reportVersion: number;
  page: number;
}) {
  const rows = await getDb()
    .select({
      id: revisionRequest.id,
      requester: user.name,
      baseVersion: revisionRequest.baseVersion,
      reason: revisionRequest.reason,
      changes: revisionRequest.proposedChanges,
      status: revisionRequest.status,
      reviewReason: revisionRequest.reviewReason,
      reviewedAt: revisionRequest.reviewedAt,
      createdAt: revisionRequest.createdAt,
      version: revisionRequest.version,
    })
    .from(revisionRequest)
    .innerJoin(
      user,
      and(
        eq(user.id, revisionRequest.requesterId),
        eq(user.organizationId, revisionRequest.organizationId),
      ),
    )
    .where(
      and(
        eq(revisionRequest.organizationId, actor.organizationId),
        eq(revisionRequest.reportId, reportId),
        actor.role === "BOSS" || authorId === actor.id
          ? undefined
          : or(
              eq(revisionRequest.requesterId, actor.id),
              eq(revisionRequest.reviewerId, actor.id),
            ),
      ),
    )
    .orderBy(desc(revisionRequest.createdAt), desc(revisionRequest.id))
    .limit(21)
    .offset((page - 1) * 20);
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200/80 p-6">
      <h2 className="text-xl font-medium leading-7">修订申请</h2>
      {!rows.length && <p className="text-slate-500">暂无修订申请</p>}
      <ul className="divide-y divide-separator-border">
        {rows.slice(0, 20).map((row) => {
          const changes = row.changes as { summary?: unknown } | null;
          return (
            <li key={row.id} className="flex flex-col gap-3 py-4">
              <p className="text-sm font-medium leading-5">
                {row.requester} ·{" "}
                {row.status === "PENDING"
                  ? "待审核"
                  : row.status === "APPROVED"
                    ? "已通过"
                    : "已拒绝"}
              </p>
              <p className="text-slate-500">
                {row.createdAt.toLocaleString("zh-CN", {
                  timeZone: "Asia/Shanghai",
                })}
              </p>
              <p className="whitespace-pre-wrap break-words">
                申请原因：{row.reason}
              </p>
              <details>
                <summary className="cursor-pointer">拟修订总结</summary>
                <p className="mt-3 whitespace-pre-wrap break-words">
                  {typeof changes?.summary === "string"
                    ? changes.summary || "未填写总结"
                    : "申请内容无法读取"}
                </p>
              </details>
              {row.reviewReason && (
                <p className="whitespace-pre-wrap break-words">
                  审核说明：{row.reviewReason}
                </p>
              )}
              {row.reviewedAt && (
                <p className="text-slate-500">
                  审核时间：
                  {row.reviewedAt.toLocaleString("zh-CN", {
                    timeZone: "Asia/Shanghai",
                  })}
                </p>
              )}
              {actor.role === "BOSS" && row.status === "PENDING" && (
                <RevisionReviewForm
                  key={`${row.id}:${row.version}`}
                  requestId={row.id}
                  version={row.version}
                  stale={reportVersion !== row.baseVersion}
                />
              )}
            </li>
          );
        })}
      </ul>
      <nav
        aria-label="修订申请分页"
        className="flex flex-wrap items-center gap-3"
      >
        {page > 1 && (
          <ButtonLink
            variant="secondary"
            href={`/reports/${reportId}?requestsPage=${page - 1}`}
          >
            上一页
          </ButtonLink>
        )}
        <span>第 {page} 页</span>
        {rows.length > 20 && (
          <ButtonLink
            variant="secondary"
            href={`/reports/${reportId}?requestsPage=${page + 1}`}
          >
            下一页
          </ButtonLink>
        )}
      </nav>
    </section>
  );
}

