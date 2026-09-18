import { and, eq, lt, sql } from "drizzle-orm";
import { getDb } from "../src/lib/db/index.js";
import { auditLog } from "../src/lib/db/schema.js";
import { runJob } from "./run-job.js";

const retentionDays = Number(process.env.LOGIN_AUDIT_RETENTION_DAYS ?? 180);

async function main() {
  if (!Number.isInteger(retentionDays) || retentionDays < 30) {
    throw new Error("LOGIN_AUDIT_RETENTION_DAYS must be an integer >= 30");
  }
  const result = await getDb()
    .delete(auditLog)
    .where(
      and(
        eq(auditLog.action, "PASSWORD_AUTHENTICATION"),
        lt(
          auditLog.createdAt,
          sql`now() - make_interval(days => ${retentionDays})`,
        ),
      ),
    )
    .returning({ id: auditLog.id });
  console.log(
    `Removed ${result.length} login audit records older than ${retentionDays} days.`,
  );
}

void runJob("Login audit cleanup", main);
