import { and, desc, eq } from "drizzle-orm";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { getDb } from "@/lib/db";
import { workTask } from "@/lib/db/schema";
import * as XLSX from "xlsx";
export async function GET(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role === "ADMIN")
      throw new BusinessError("管理员不能导出业务任务", 403);
    const rows = await getDb()
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
      .orderBy(desc(workTask.updatedAt), desc(workTask.id))
      .limit(5000);
    if (new URL(request.url).searchParams.get("format") === "xlsx") {
      const sheet = XLSX.utils.json_to_sheet(rows);
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
      { items: rows },
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
