import { and, eq, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { blocker, user } from "@/lib/db/schema";
import { blockerVisibility } from "@/lib/blockers";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ButtonLink } from "@/components/base/buttons/button";
import { BlockerActions } from "@/components/workspace/blocker-actions";
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
  const coordinators =
    actor.role === "BOSS"
      ? await getDb()
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(
            and(
              eq(user.organizationId, actor.organizationId),
              eq(user.status, "ACTIVE"),
              ne(user.role, "ADMIN"),
            ),
          )
      : [];
  return (
    <WorkspaceShell actor={actor} selected="blockers">
      <ButtonLink href="/blockers" variant="ghost">
        返回阻塞中心
      </ButtonLink>
      <h1 className="text-title-1-medium">阻塞详情</h1>
      <p>
        {{ NORMAL: "一般", IMPORTANT: "重要", URGENT: "紧急" }[item.severity]} ·{" "}
        {
          { OPEN: "待处理", ACKNOWLEDGED: "已接收", RESOLVED: "已解决" }[
            item.status
          ]
        }
      </p>
      <p className="whitespace-pre-wrap break-words">{item.description}</p>
      {item.resolution && (
        <p className="whitespace-pre-wrap break-words">
          解决说明：{item.resolution}
        </p>
      )}
      {item.status !== "RESOLVED" && (
        <BlockerActions
          id={item.id}
          version={item.version}
          canAcknowledge={
            (actor.role === "BOSS" || actor.id === item.coordinatorId) &&
            item.status === "OPEN"
          }
          canResolve={actor.role === "BOSS" || actor.id === item.reporterId}
          canAssign={actor.role === "BOSS"}
          coordinators={coordinators}
        />
      )}
    </WorkspaceShell>
  );
}
