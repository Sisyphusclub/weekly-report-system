import { and, desc, eq } from "drizzle-orm";
import { apiError, enforceRateLimit, writeActor } from "@/lib/api";
import { getDb } from "@/lib/db";
import { auditLog, workTask } from "@/lib/db/schema";
import ExcelJS from "exceljs";
export async function GET(request: Request) {
  try {
    const actor = await writeActor(request);
    enforceRateLimit(`task-export:${actor.organizationId}:${actor.id}`, 10, 60_000);
    const query = getDb()
      .select({
        projectId: workTask.projectId,
        categoryId: workTask.categoryId,
        primaryAssigneeId: workTask.primaryAssigneeId,
        content: workTask.content,
        kind: workTask.kind,
        status: workTask.status,
        workDate: workTask.workDate,
        dueDate: workTask.dueDate,
      })
      .from(workTask)
      .where(
        and(
          eq(workTask.organizationId, actor.organizationId),
          actor.role === "EMPLOYEE"
            ? eq(workTask.primaryAssigneeId, actor.id)
            : undefined,
        ),
      )
      .orderBy(desc(workTask.updatedAt), desc(workTask.id));
    const rows = await (actor.role === "ADMIN" ? query : query.limit(5000));
    await getDb().insert(auditLog).values({
      id: crypto.randomUUID(),
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "TASK_EXPORT",
      resourceType: "TASK",
      resourceId: "BATCH",
      result: "SUCCESS",
    });
    if (new URL(request.url).searchParams.get("format") === "xlsx") {
      const generatedAt = new Date().toISOString();
      const exportRows = rows.map((row) => ({
        ...row,
        generatedAt,
        generatedBy: actor.id,
      }));
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("任务");
      sheet.columns = Object.keys(exportRows[0] ?? {}).map((key) => ({
        header: key,
        key,
      }));
      exportRows.forEach((row) => sheet.addRow(row));
      const buffer = await workbook.xlsx.writeBuffer();
      return new Response(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": "attachment; filename=tasks.xlsx",
          "Cache-Control": "no-store",
        },
      });
    }
    return Response.json(
      {
        items: rows,
        generatedAt: new Date().toISOString(),
        generatedBy: actor.id,
      },
      {
        headers: {
          "Content-Disposition": "attachment; filename=tasks.json",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (e) {
    return apiError(e);
  }
}
