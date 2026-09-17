import { and, asc, eq } from "drizzle-orm";
import { writeActor, BusinessError, apiError } from "@/lib/api";
import { getDb } from "@/lib/db";
import { taskAttachment, workTask } from "@/lib/db/schema";
import { deleteObject, downloadUrl, uploadUrl } from "@/lib/storage";
import { attachmentInput } from "@/lib/attachment-input";
export async function GET(request: Request) {
  try {
    const actor = await writeActor(request);
    const taskId = new URL(request.url).searchParams.get("taskId");
    if (!taskId) throw new BusinessError("任务参数无效");
    const db = getDb();
    const rows = await db
      .select()
      .from(taskAttachment)
      .where(
        and(
          eq(taskAttachment.organizationId, actor.organizationId),
          eq(taskAttachment.taskId, taskId),
        ),
      )
      .orderBy(asc(taskAttachment.createdAt));
    const task = await db
      .select({ id: workTask.id, assignee: workTask.primaryAssigneeId })
      .from(workTask)
      .where(
        and(
          eq(workTask.organizationId, actor.organizationId),
          eq(workTask.id, taskId),
        ),
      )
      .limit(1);
    if (
      !task[0] ||
      (actor.role === "EMPLOYEE" && task[0].assignee !== actor.id)
    )
      throw new BusinessError("无权查看任务附件", 403);
    return Response.json({
      items: await Promise.all(
        rows.map(async (row) => ({
          ...row,
          url: await downloadUrl(row.objectKey, row.fileName),
        })),
      ),
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    const body = await request.json().catch(() => null);
    const parsed = attachmentInput.safeParse(body);
    if (!parsed.success) throw new BusinessError("附件格式或大小无效");
    const taskId = typeof body?.taskId === "string" ? body.taskId : "";
    const [task] = await getDb()
      .select({ id: workTask.id, assignee: workTask.primaryAssigneeId })
      .from(workTask)
      .where(
        and(
          eq(workTask.organizationId, actor.organizationId),
          eq(workTask.id, taskId),
        ),
      )
      .limit(1);
    if (!task || (actor.role === "EMPLOYEE" && task.assignee !== actor.id))
      throw new BusinessError("无权上传任务附件", 403);
    const id = crypto.randomUUID();
    const safeName = parsed.data.fileName
      .split(/[\\/]/)
      .pop()!
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 120);
    const objectKey = `${actor.organizationId}/tasks/${taskId}/${id}-${safeName}`;
    const checksum = Buffer.from(parsed.data.sha256, "hex").toString("base64");
    const url = await uploadUrl(objectKey, parsed.data.contentType, checksum);
    await getDb()
      .insert(taskAttachment)
      .values({
        id,
        organizationId: actor.organizationId,
        taskId,
        uploadedBy: actor.id,
        ...parsed.data,
        objectKey,
      });
    return Response.json({ id, uploadUrl: url });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const actor = await writeActor(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new BusinessError("附件参数无效");
    const db = getDb();
    const [row] = await db
      .select({
        id: taskAttachment.id,
        objectKey: taskAttachment.objectKey,
        assignee: workTask.primaryAssigneeId,
      })
      .from(taskAttachment)
      .innerJoin(
        workTask,
        and(
          eq(workTask.organizationId, taskAttachment.organizationId),
          eq(workTask.id, taskAttachment.taskId),
        ),
      )
      .where(
        and(
          eq(taskAttachment.id, id),
          eq(taskAttachment.organizationId, actor.organizationId),
        ),
      )
      .limit(1);
    if (!row || (actor.role === "EMPLOYEE" && row.assignee !== actor.id))
      throw new BusinessError("无权删除任务附件", 403);
    await deleteObject(row.objectKey);
    await db.delete(taskAttachment).where(eq(taskAttachment.id, id));
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
