import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { blocker } from "@/lib/db/schema";
import { blockerVisibility } from "@/lib/blockers";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ButtonLink } from "@/components/motion/button/base";
import { Badge } from "@/components/premium/badge";
import { BlockerActions } from "@/components/workspace/blocker-actions";
import { BlockerCommentSection } from "@/components/workspace/blocker-comment-section";
export default async function BlockerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireUser();
  const { id } = await params;
  const [item] = await getDb()
    .select()
    .from(blocker)
    .where(and(blockerVisibility(actor), eq(blocker.id, id)))
    .limit(1);
  if (!item) notFound();
  const canAcknowledge =
    actor.id === item.coordinatorId && item.status === "OPEN";
  const canResolve = actor.id === item.reporterId;
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
  return (
    <WorkspaceShell actor={actor} selected="blockers">
      <ButtonLink href="/blockers" variant="ghost">
        返回阻塞中心
      </ButtonLink>
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={severityTone[item.severity]}>
            {severityLabel[item.severity]}
          </Badge>
          <Badge color={statusTone[item.status]}>
            {statusLabel[item.status]}
          </Badge>
          {item.isSensitive ? <Badge color="neutral">敏感内容</Badge> : null}
        </div>
        <h1 className="text-2xl font-medium leading-8">阻塞详情</h1>
        <p className="whitespace-pre-wrap break-words text-foreground">
          {item.description}
        </p>
        {item.resolution && (
          <p className="whitespace-pre-wrap break-words text-muted-foreground">
            解决说明：{item.resolution}
          </p>
        )}
        {item.status !== "RESOLVED" && (canAcknowledge || canResolve) && (
          <BlockerActions
            id={item.id}
            version={item.version}
            canAcknowledge={canAcknowledge}
            canResolve={canResolve}
          />
        )}
      </section>
      <BlockerCommentSection
        blockerId={id}
        actorId={actor.id}
        readOnly={actor.role === "BOSS"}
      />
    </WorkspaceShell>
  );
}
