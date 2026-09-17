import { and, desc, eq } from "drizzle-orm";
import { apiError, writeActor } from "@/lib/api";
import { getDb } from "@/lib/db";
import { auditLog, workTask } from "@/lib/db/schema";
import * as XLSX from "xlsx";
export async function GET(request: Request) {
  try {
    const actor = await writeActor(request);
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
      const sheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "任务");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
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
