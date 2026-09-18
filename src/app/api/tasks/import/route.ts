import { and, eq, ne } from "drizzle-orm";
import {
  writeActor,
  BusinessError,
  apiError,
  enforceRateLimit,
} from "@/lib/api";
import { taskImportBatch } from "@/lib/task-import-input";
import { getDb } from "@/lib/db";
import { auditLog, category, project, user, workTask } from "@/lib/db/schema";
import ExcelJS from "exceljs";
import { boundedBody } from "@/lib/request-body";
import { excelDate } from "@/lib/excel-date";
export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    enforceRateLimit(
      `task-import:${actor.organizationId}:${actor.id}`,
      5,
      60_000,
    );
    const contentType = request.headers.get("content-type") ?? "";
    const maxBody = contentType.includes("multipart/form-data")
      ? 12 * 1024 * 1024
      : 2 * 1024 * 1024;
    const body = await boundedBody(request, maxBody);
    let payload: unknown;
    if (contentType.includes("multipart/form-data")) {
      const form = await body.formData().catch(() => {
        throw new BusinessError("上传内容无效，请重新选择 Excel 文件");
      });
      const file = form.get("file");
      if (!(file instanceof File)) throw new BusinessError("请选择 Excel 文件");
      if (!file.name.toLowerCase().endsWith(".xlsx"))
        throw new BusinessError("仅支持 .xlsx 文件");
      if (file.size > 10 * 1024 * 1024)
        throw new BusinessError("Excel 文件不能超过 10 MB");
      const workbook = new ExcelJS.Workbook();
      try {
        await workbook.xlsx.load(await file.arrayBuffer());
      } catch {
        throw new BusinessError("无法读取 Excel 文件，请确认文件完整且未加密");
      }
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new BusinessError("Excel 文件没有工作表");
      const headers = (sheet.getRow(1).values as unknown[])
        .slice(1)
        .map(String);
      const rows: Record<string, unknown>[] = [];
      sheet.eachRow((row, index) => {
        if (index > 1) {
          if (rows.length >= 200)
            throw new BusinessError(
              "每次最多导入 200 条任务，请拆分文件后重试",
            );
          const values = (row.values as unknown[]).slice(1);
          rows.push(
            Object.fromEntries(
              headers.map((header, i) => [header, values[i] ?? null]),
            ),
          );
        }
      });
      payload = {
        items: rows.map((row) => ({
          projectId: row.projectId ?? row["项目编号"],
          categoryId: row.categoryId ?? row["分类编号"],
          primaryAssigneeId: row.primaryAssigneeId ?? row["负责人编号"],
          content: row.content ?? row["任务内容"],
          kind: row.kind ?? row["任务类型"],
          status: row.status ?? row["状态"] ?? "TODO",
          workDate: excelDate(row.workDate ?? row["工作日期"]),
          dueDate: excelDate(row.dueDate ?? row["截止日期"]),
        })),
      };
    } else payload = await body.json().catch(() => null);
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
