import { and, eq, isNull, lt } from "drizzle-orm";
import { getDb } from "../src/lib/db/index.js";
import { taskAttachment } from "../src/lib/db/schema.js";
import { deleteObject } from "../src/lib/storage.js";
import { runJob } from "./run-job.js";

async function main() {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  const db = getDb();
  const rows = await db
    .select({ id: taskAttachment.id, objectKey: taskAttachment.objectKey })
    .from(taskAttachment)
    .where(
      and(
        isNull(taskAttachment.verifiedAt),
        lt(taskAttachment.createdAt, cutoff),
      ),
    );
  for (const row of rows) {
    await deleteObject(row.objectKey);
    await db.delete(taskAttachment).where(eq(taskAttachment.id, row.id));
  }
  console.log(`Cleaned ${rows.length} unverified attachments.`);
}
void runJob("Attachment cleanup", main);
