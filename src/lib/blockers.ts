import { and, eq, or, sql } from "drizzle-orm";
import { blocker } from "@/lib/db/schema";
import type { Actor } from "@/lib/domain";
export function blockerVisibility(actor: Actor) {
  return and(
    eq(blocker.organizationId, actor.organizationId),
    actor.role === "ADMIN"
      ? sql`false`
      : actor.role === "BOSS"
        ? undefined
        : or(
            eq(blocker.isSensitive, false),
            eq(blocker.reporterId, actor.id),
            eq(blocker.coordinatorId, actor.id),
          ),
  );
}
