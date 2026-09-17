import { and, eq, inArray, ne } from "drizzle-orm";
import { apiError, BusinessError, writeActor } from "@/lib/api";
import { projectInput } from "@/lib/project-input";
import { getDb } from "@/lib/db";
import { project, projectMember, user, auditLog } from "@/lib/db/schema";
export async function POST(request: Request) {
  try {
    const actor = await writeActor(request);
    if (actor.role !== "ADMIN")
      throw new BusinessError("仅管理员可维护项目", 403);
    const parsed = projectInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      throw new BusinessError("项目名称、日期、成员或版本无效");
    const input = parsed.data;
    const result = await getDb().transaction(async (tx) => {
      const members = [...new Set([input.ownerId, ...input.memberIds])];
      const people = await tx
        .select({ id: user.id })
        .from(user)
        .where(
          and(
            eq(user.organizationId, actor.organizationId),
            inArray(user.id, members),
            ne(user.role, "ADMIN"),
            eq(user.status, "ACTIVE"),
          ),
        )
        .for("share");
      if (people.length !== members.length)
        throw new BusinessError("负责人及成员必须是本组织的有效业务账号");
      const id = input.id ?? crypto.randomUUID();
      const values = {
        name: input.name,
        description: input.description || null,
        ownerId: input.ownerId,
        status: input.status,
        startDate: input.startDate,
        targetEndDate: input.targetEndDate,
        version: input.version + 1,
        updatedAt: new Date(),
      };
      if (input.id) {
        const changed = await tx
          .update(project)
          .set(values)
          .where(
            and(
              eq(project.id, id),
              eq(project.organizationId, actor.organizationId),
              eq(project.version, input.version),
            ),
          )
          .returning({ id: project.id });
        if (!changed.length)
          throw new BusinessError("项目不存在或已被修改，请刷新核对", 409);
        await tx
          .delete(projectMember)
          .where(
            and(
              eq(projectMember.organizationId, actor.organizationId),
              eq(projectMember.projectId, id),
            ),
          );
      } else
        await tx
          .insert(project)
          .values({ id, organizationId: actor.organizationId, ...values });
      await tx
        .insert(projectMember)
        .values(
          members.map((userId) => ({
            organizationId: actor.organizationId,
            projectId: id,
            userId,
          })),
        );
      await tx
        .insert(auditLog)
        .values({
          id: crypto.randomUUID(),
          organizationId: actor.organizationId,
          actorId: actor.id,
          action: input.id ? "PROJECT_UPDATE" : "PROJECT_CREATE",
          resourceType: "project",
          resourceId: id,
          result: "SUCCESS",
        });
      return { id, version: values.version };
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
