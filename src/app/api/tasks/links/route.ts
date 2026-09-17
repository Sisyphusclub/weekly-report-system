import { and, eq } from "drizzle-orm";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { externalLinkInput } from "@/lib/external-link-input";
import { getDb } from "@/lib/db";
import { auditLog, externalLink, workTask } from "@/lib/db/schema";
export async function GET(request: Request) {
  try {
    const actor = await writeActor(request);
    const taskId = new URL(request.url).searchParams.get("taskId");
    if (!taskId) throw new BusinessError("任务编号无效");
    const [task] = await getDb()
      .select({ id: workTask.id, assignee: workTask.primaryAssigneeId })
      .from(workTask)
      .where(
        and(
          eq(workTask.id, taskId),
          eq(workTask.organizationId, actor.organizationId),
        ),
      )
      .limit(1);
    if (!task || (actor.role === "EMPLOYEE" && task.assignee !== actor.id))
      throw new BusinessError("任务不存在或无权查看", 404);
    const items = await getDb()
      .select()
      .from(externalLink)
      .where(
        and(
          eq(externalLink.organizationId, actor.organizationId),
          eq(externalLink.taskId, taskId),
        ),
      );
    return Response.json({ items });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    const parsed = externalLinkInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) throw new BusinessError("外部链接格式无效");
    const input = parsed.data;
    const result = await getDb().transaction(async (tx) => {
      const [task] = await tx
        .select({ id: workTask.id, assignee: workTask.primaryAssigneeId })
        .from(workTask)
        .where(
          and(
            eq(workTask.id, input.taskId),
            eq(workTask.organizationId, actor.organizationId),
          ),
        )
        .limit(1);
      if (!task) throw new BusinessError("任务不存在", 404);
      if (actor.role !== "BOSS" && task.assignee !== actor.id)
        throw new BusinessError("无权添加链接", 403);
      const id = crypto.randomUUID();
      await tx.insert(externalLink).values({
        id,
        organizationId: actor.organizationId,
        taskId: input.taskId,
        title: input.title,
        url: input.url,
        createdBy: actor.id,
      });
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "EXTERNAL_LINK_CREATE",
        resourceType: "TASK",
        resourceId: input.taskId,
        result: "SUCCESS",
      });
      return { id };
    });
    return Response.json(result, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
