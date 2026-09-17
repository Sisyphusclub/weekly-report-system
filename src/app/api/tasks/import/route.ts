import { and, eq, ne } from "drizzle-orm";
import { writeActor, BusinessError, apiError } from "@/lib/api";
import { taskImportBatch } from "@/lib/task-import-input";
import { getDb } from "@/lib/db";
import { auditLog, category, project, user, workTask } from "@/lib/db/schema";
import * as XLSX from "xlsx";
export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    const contentType = request.headers.get("content-type") ?? "";
    let payload: unknown;
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new BusinessError("请选择 Excel 文件");
      if (!file.name.toLowerCase().endsWith(".xlsx"))
        throw new BusinessError("仅支持 .xlsx 文件");
      if (file.size > 10 * 1024 * 1024)
        throw new BusinessError("Excel 文件不能超过 10 MB");
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: false,
      });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new BusinessError("Excel 文件没有工作表");
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: null,
      });
      payload = {
        items: rows.map((row) => ({
          projectId: row.projectId ?? row["项目编号"],
          categoryId: row.categoryId ?? row["分类编号"],
          primaryAssigneeId: row.primaryAssigneeId ?? row["负责人编号"],
          content: row.content ?? row["任务内容"],
          kind: row.kind ?? row["任务类型"],
          status: row.status ?? row["状态"] ?? "TODO",
          workDate: row.workDate ?? row["工作日期"] ?? null,
          dueDate: row.dueDate ?? row["截止日期"] ?? null,
        })),
      };
    } else payload = await request.json().catch(() => null);
    const parsed = taskImportBatch.safeParse(payload);
    if (!parsed.success) throw new BusinessError("导入任务格式无效");
    const result = await getDb().transaction(async (tx) => {
      const created: string[] = [];
      for (const item of parsed.data.items) {
        if (actor.role === "EMPLOYEE" && item.primaryAssigneeId !== actor.id)
          throw new BusinessError("只能导入自己的任务", 403);
        if (item.kind === "ACTUAL" && !item.workDate)
          throw new BusinessError("实际任务必须填写工作日期");
        if (item.kind === "PLAN" && !item.dueDate)
          throw new BusinessError("计划必须填写截止日期");
        const [refs] = await tx
          .select({ categoryName: category.name })
          .from(project)
          .innerJoin(category, eq(category.id, item.categoryId))
          .innerJoin(user, eq(user.id, item.primaryAssigneeId))
          .where(
            and(
              eq(project.id, item.projectId),
              eq(project.organizationId, actor.organizationId),
              ne(project.status, "ARCHIVED"),
              eq(category.organizationId, actor.organizationId),
              eq(category.enabled, true),
              eq(user.organizationId, actor.organizationId),
              eq(user.status, "ACTIVE"),
              ne(user.role, "ADMIN"),
            ),
          )
          .limit(1);
        if (!refs) throw new BusinessError("项目、分类或负责人无效");
        const id = crypto.randomUUID();
        await tx.insert(workTask).values({
          id,
          organizationId: actor.organizationId,
          createdById: actor.id,
          projectId: item.projectId,
          categoryId: item.categoryId,
          categoryName: refs.categoryName,
          primaryAssigneeId: item.primaryAssigneeId,
          content: item.content,
          kind: item.kind,
          status: item.status,
          workDate: item.workDate,
          dueDate: item.dueDate,
          version: 1,
          sourceTaskId: null,
        });
        created.push(id);
      }
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "TASK_IMPORT",
        resourceType: "TASK",
        resourceId: created[0],
        result: "SUCCESS",
      });
      return { created: created.length, ids: created };
    });
    return Response.json(result, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
