import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  report,
  reportRevision,
  auditLog,
  workCalendarDay,
  workTask,
  reportTask,
  deliverable,
  project,
} from "@/lib/db/schema";
import { deadline, validateSubmission } from "@/lib/domain";
import {
  dailyBlockersSchema,
  dailyEntriesSchema,
  dailyInput,
  shanghaiDate,
} from "@/lib/daily-input";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { DailyConflict } from "@/lib/daily-conflict";

export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    const parsed = dailyInput.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new BusinessError("日报内容或版本无效，请检查后重试");
    const input = parsed.data;
    if (input.reportDate > shanghaiDate())
      throw new BusinessError("不能提前填写未来日报");
    const result = await getDb().transaction(async (tx) => {
      const taskRows = input.taskIds.length
        ? await tx
            .select({
              id: workTask.id,
              content: workTask.content,
              kind: workTask.kind,
              status: workTask.status,
              projectId: workTask.projectId,
              categoryId: workTask.categoryId,
              categoryName: workTask.categoryName,
              dueDate: workTask.dueDate,
            })
            .from(workTask)
            .where(
              and(
                eq(workTask.organizationId, actor.organizationId),
                inArray(workTask.id, input.taskIds),
                eq(workTask.primaryAssigneeId, actor.id),
              ),
            )
            .orderBy(workTask.id)
            .for("share")
        : [];
      const deliveries = input.taskIds.length
        ? await tx
            .select({
              taskId: deliverable.taskId,
              unitId: deliverable.unitId,
              unitName: deliverable.unitName,
              quantity: deliverable.quantity,
            })
            .from(deliverable)
            .where(
              and(
                eq(deliverable.organizationId, actor.organizationId),
                inArray(deliverable.taskId, input.taskIds),
              ),
            )
        : [];
      const selectedTasks = taskRows.map((task) => ({
        ...task,
        deliverables: deliveries
          .filter((item) => item.taskId === task.id)
          .map(({ unitId, unitName, quantity }) => ({
            unitId,
            unitName,
            quantity,
          })),
      }));
      if (selectedTasks.length !== input.taskIds.length)
        throw new BusinessError("任务不存在或无权选择", 403);
      const blockerProjectIds = [...new Set(input.blockers.map((item) => item.projectId))];
      const blockerProjects = blockerProjectIds.length
        ? await tx
            .select({ id: project.id, name: project.name })
            .from(project)
            .where(
              and(
                eq(project.organizationId, actor.organizationId),
                inArray(project.id, blockerProjectIds),
                ne(project.status, "ARCHIVED"),
              ),
            )
            .orderBy(asc(project.name))
        : [];
      if (blockerProjects.length !== blockerProjectIds.length)
        throw new BusinessError("阻塞关联的项目无效或已归档");
      const blockerProjectNames = new Map(
        blockerProjects.map((item) => [item.id, item.name]),
      );
      const blockers = input.blockers.map((item) => ({
        ...item,
        projectName: blockerProjectNames.get(item.projectId),
      }));
      if (input.submit) {
        try {
          validateSubmission({
            tasks: selectedTasks,
            works: input.works,
            plans: input.plans,
            noWorkReason: input.noWorkReason,
            noPlanReason: input.noPlanReason,
          });
        } catch (error) {
          throw new BusinessError((error as Error).message);
        }
      }
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
      if (
        existing &&
        (existing.status === "SUBMITTED" || existing.version !== input.version)
      ) {
        const links = await tx
          .select({ taskId: reportTask.taskId })
          .from(reportTask)
          .where(
            and(
              eq(reportTask.organizationId, actor.organizationId),
              eq(reportTask.reportId, existing.id),
            ),
          );
        throw new DailyConflict({
          id: existing.id,
          version: existing.version,
          status: existing.status,
          summary: existing.summary ?? "",
          noWorkReason: existing.noWorkReason ?? "",
          noPlanReason: existing.noPlanReason ?? "",
          taskIds: links.map((link) => link.taskId),
          plans: dailyEntriesSchema.parse(existing.planEntries),
          works: dailyEntriesSchema.parse(existing.workEntries),
          blockers: dailyBlockersSchema.parse(existing.blockers),
        });
      }
      if (!existing && input.version !== 0)
        throw new BusinessError("草稿不存在，请重新打开日报", 409);
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
        planEntries: input.plans,
        workEntries: input.works,
        blockers,
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
        await tx.insert(report).values({
          id,
          organizationId: actor.organizationId,
          authorId: actor.id,
          type: "DAILY",
          reportDate: input.reportDate,
          dueAt,
          calendarVersion: calendar?.version ?? 0,
          ...values,
        });
      await tx
        .delete(reportTask)
        .where(
          and(
            eq(reportTask.organizationId, actor.organizationId),
            eq(reportTask.reportId, id),
          ),
        );
      if (selectedTasks.length)
        await tx.insert(reportTask).values(
          selectedTasks.map((task) => ({
            organizationId: actor.organizationId,
            reportId: id,
            taskId: task.id,
            snapshot: task,
            sourceReportId: id,
          })),
        );
      if (input.submit)
        await tx.insert(reportRevision).values({
          id: crypto.randomUUID(),
          organizationId: actor.organizationId,
          reportId: id,
          revisionNumber: 1,
          editorId: actor.id,
          reason: "首次提交日报",
          snapshot: {
            ...values,
            reportDate: input.reportDate,
            tasks: selectedTasks,
            plans: input.plans,
            works: input.works,
            blockers,
          },
          diff: { status: ["DRAFT", "SUBMITTED"] },
        });
      await tx.insert(auditLog).values({
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
    if (error instanceof DailyConflict)
      return Response.json(
        { error: error.message, remote: error.remote },
        { status: 409 },
      );
    return apiError(error);
  }
}
