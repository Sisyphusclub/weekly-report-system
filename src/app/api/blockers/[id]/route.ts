import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { writeActor, apiError, BusinessError } from "@/lib/api";
import { getDb } from "@/lib/db";
import { auditLog, blocker, notification, user } from "@/lib/db/schema";
import { canReadBlocker } from "@/lib/domain";
const input = z.object({
  action: z.enum(["ACKNOWLEDGE", "RESOLVE", "ASSIGN"]),
  coordinatorId: z.string().min(1).nullable().optional(),
  resolution: z.string().trim().max(5000).optional(),
  version: z.number().int().positive(),
});
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await writeActor(request);
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return Response.json({ error: "操作参数无效" }, { status: 400 });
    const { id } = await params;
    const result = await getDb().transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(blocker)
        .where(
          and(
            eq(blocker.id, id),
            eq(blocker.organizationId, actor.organizationId),
          ),
        )
        .limit(1);
      if (!item || !canReadBlocker(actor, item)) throw new Error("NOT_FOUND");
      if (item.version !== parsed.data.version) throw new Error("CONFLICT");
      if (item.status === "RESOLVED") throw new Error("CONFLICT");
      if (parsed.data.action === "ASSIGN") {
        if (actor.role !== "BOSS") throw new Error("FORBIDDEN");
        if (!parsed.data.coordinatorId) throw new Error("COORDINATOR_REQUIRED");
        const [coordinator] = await tx
          .select({ id: user.id })
          .from(user)
          .where(
            and(
              eq(user.id, parsed.data.coordinatorId),
              eq(user.organizationId, actor.organizationId),
              eq(user.status, "ACTIVE"),
              ne(user.role, "ADMIN"),
            ),
          )
          .limit(1);
        if (!coordinator) throw new Error("COORDINATOR_INVALID");
        const [updated] = await tx
          .update(blocker)
          .set({
            coordinatorId: coordinator.id,
            status: "OPEN",
            acknowledgedAt: null,
            version: item.version + 1,
            updatedAt: new Date(),
          })
          .where(and(eq(blocker.id, id), eq(blocker.version, item.version)))
          .returning({ version: blocker.version, status: blocker.status });
        if (!updated) throw new Error("CONFLICT");
        await tx
          .insert(auditLog)
          .values({
            id: crypto.randomUUID(),
            organizationId: actor.organizationId,
            actorId: actor.id,
            action: "BLOCKER_ASSIGN",
            resourceType: "BLOCKER",
            resourceId: id,
            result: "SUCCESS",
          });
        await tx
          .insert(notification)
          .values({
            id: crypto.randomUUID(),
            organizationId: actor.organizationId,
            recipientId: coordinator.id,
            dedupeKey: `blocker-assigned:${id}:${updated.version}`,
            type: "BLOCKER_ASSIGNED",
            title: "有阻塞需要你协调",
            link: `/blockers/${id}`,
          })
          .onConflictDoNothing();
        return updated;
      }
      if (
        parsed.data.action === "ACKNOWLEDGE" &&
        actor.role !== "BOSS" &&
        actor.id !== item.coordinatorId
      )
        throw new Error("FORBIDDEN");
      if (parsed.data.action === "ACKNOWLEDGE" && item.status !== "OPEN")
        throw new Error("CONFLICT");
      if (
        parsed.data.action === "RESOLVE" &&
        actor.id !== item.reporterId &&
        actor.role !== "BOSS"
      )
        throw new Error("FORBIDDEN");
      const resolved = parsed.data.action === "RESOLVE";
      if (resolved && !parsed.data.resolution)
        throw new Error("RESOLUTION_REQUIRED");
      const [updated] = await tx
        .update(blocker)
        .set({
          status: resolved ? "RESOLVED" : "ACKNOWLEDGED",
          acknowledgedAt: item.acknowledgedAt ?? new Date(),
          resolvedAt: resolved ? new Date() : null,
          resolution: resolved ? parsed.data.resolution : item.resolution,
          version: item.version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(blocker.id, id), eq(blocker.version, item.version)))
        .returning({ version: blocker.version, status: blocker.status });
      if (!updated) throw new Error("CONFLICT");
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: resolved ? "BLOCKER_RESOLVE" : "BLOCKER_ACKNOWLEDGE",
        resourceType: "BLOCKER",
        resourceId: id,
        result: "SUCCESS",
      });
      if (resolved && item.reporterId !== actor.id)
        await tx
          .insert(notification)
          .values({
            id: crypto.randomUUID(),
            organizationId: actor.organizationId,
            recipientId: item.reporterId,
            dedupeKey: `blocker-resolved:${id}:${item.version}`,
            type: "BLOCKER_RESOLVED",
            title: "阻塞已解决",
            link: `/blockers/${id}`,
          })
          .onConflictDoNothing();
      return updated;
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof BusinessError) return apiError(error);
    const code = error instanceof Error ? error.message : "";
    if (
      ![
        "NOT_FOUND",
        "FORBIDDEN",
        "CONFLICT",
        "RESOLUTION_REQUIRED",
        "COORDINATOR_REQUIRED",
        "COORDINATOR_INVALID",
      ].includes(code)
    )
      return apiError(error);
    const status =
      code === "NOT_FOUND"
        ? 404
        : code === "FORBIDDEN"
          ? 403
          : code === "CONFLICT"
            ? 409
            : 400;
    return Response.json(
      {
        error:
          code === "CONFLICT"
            ? "阻塞已被更新，请刷新后重试"
            : code === "RESOLUTION_REQUIRED"
              ? "请填写解决说明"
              : code === "COORDINATOR_REQUIRED" ||
                  code === "COORDINATOR_INVALID"
                ? "请选择有效的协调负责人"
                : "无法执行该操作",
      },
      { status },
    );
  }
}
