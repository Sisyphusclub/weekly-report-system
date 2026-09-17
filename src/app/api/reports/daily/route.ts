import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  report,
  reportRevision,
  auditLog,
  workCalendarDay,
  workTask,
  reportTask,
} from "@/lib/db/schema";
import { deadline, validateSubmission } from "@/lib/domain";
import { dailyInput, shanghaiDate } from "@/lib/daily-input";
import { apiError, BusinessError, writeActor } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    const parsed = dailyInput.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new BusinessError("日报内容或版本无效，请检查后重试");
    const input = parsed.data;
    if (input.reportDate > shanghaiDate())
      throw new BusinessError("不能提前填写未来日报");
    const selectedTasks = input.taskIds.length
      ? await getDb()
          .select({ id: workTask.id, content: workTask.content, kind: workTask.kind, status: workTask.status, projectId: workTask.projectId, categoryId: workTask.categoryId, categoryName: workTask.categoryName, dueDate: workTask.dueDate })
          .from(workTask)
          .where(and(eq(workTask.organizationId, actor.organizationId), inArray(workTask.id, input.taskIds), eq(workTask.primaryAssigneeId, actor.id)))
      : [];
    if (selectedTasks.length !== input.taskIds.length) throw new BusinessError("任务不存在或无权选择", 403);
    if (input.submit) {
      try {
        validateSubmission({ tasks: selectedTasks, ...input });
      } catch (error) {
        throw new BusinessError((error as Error).message);
      }
    }
    const result = await getDb().transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${actor.organizationId}:${actor.id}:${input.reportDate}`}, 0))`,
      );
      const [existing] = await tx
        .select()
        .from(report)
        .where(
          and(
            eq(report.organizationId, actor.organizationId),
            eq(report.authorId, actor.id),
            eq(report.reportDate, input.reportDate),
            eq(report.type, "DAILY"),
          ),
        )
        .limit(1);
      if (existing?.status === "SUBMITTED")
        throw new BusinessError("日报已提交，请通过修订流程修改", 409);
      if ((existing?.version ?? 0) !== input.version)
        throw new BusinessError(
          "日报已在其他设备更新，请保留本地内容并刷新核对",
          409,
        );
      const [calendar] = await tx
        .select()
        .from(workCalendarDay)
        .where(
          and(
            eq(workCalendarDay.organizationId, actor.organizationId),
            eq(workCalendarDay.date, input.reportDate),
          ),
        )
        .orderBy(desc(workCalendarDay.version))
        .limit(1);
      const now = new Date();
      const dueAt = existing?.dueAt ?? deadline(input.reportDate);
      const id = existing?.id ?? crypto.randomUUID();
      const values = {
        summary: input.summary || null,
        noWorkReason: input.noWorkReason || null,
        noPlanReason: input.noPlanReason || null,
        status: input.submit ? ("SUBMITTED" as const) : ("DRAFT" as const),
        submittedAt: input.submit ? now : null,
        updatedAt: now,
        wasLate: existing?.wasLate === true || (input.submit && now > dueAt),
        revisionNumber: input.submit ? 1 : 0,
        version: input.version + 1,
      };
      if (existing)
        await tx.update(report).set(values).where(eq(report.id, id));
      else
        await tx
          .insert(report)
          .values({
            id,
            organizationId: actor.organizationId,
            authorId: actor.id,
            type: "DAILY",
            reportDate: input.reportDate,
            dueAt,
            calendarVersion: calendar?.version ?? 0,
            ...values,
          });
      await tx.delete(reportTask).where(and(eq(reportTask.organizationId, actor.organizationId), eq(reportTask.reportId, id)));
      if (selectedTasks.length)
        await tx.insert(reportTask).values(selectedTasks.map((task) => ({ organizationId: actor.organizationId, reportId: id, taskId: task.id, snapshot: task, sourceReportId: id })));
      if (input.submit)
        await tx
          .insert(reportRevision)
          .values({
            id: crypto.randomUUID(),
            organizationId: actor.organizationId,
            reportId: id,
            revisionNumber: 1,
            editorId: actor.id,
            reason: "首次提交日报",
            snapshot: { ...values, reportDate: input.reportDate, tasks: selectedTasks },
            diff: { status: ["DRAFT", "SUBMITTED"] },
          });
      await tx
        .insert(auditLog)
        .values({
          id: crypto.randomUUID(),
          organizationId: actor.organizationId,
          actorId: actor.id,
          action: input.submit ? "REPORT_SUBMIT" : "REPORT_SAVE",
          resourceType: "report",
          resourceId: id,
          result: "SUCCESS",
        });
      return { id, version: values.version, status: values.status };
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
