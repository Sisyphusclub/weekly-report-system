import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { organization, user, account, auditLog } from "../src/lib/db/schema";

// Read credentials from redirected stdin, never command-line arguments or logs.
async function main() {
  if (process.stdin.isTTY)
    throw new Error("Provide bootstrap JSON using redirected stdin.");
  let raw = "";
  for await (const chunk of process.stdin) {
    raw += chunk.toString();
    if (raw.length > 8192) throw new Error("Input too large");
  }
  const input = z
    .object({
      organizationName: z.string().trim().min(1).max(100),
      name: z.string().trim().min(1).max(100),
      username: z.string().regex(/^[a-z0-9_.]{3,30}$/),
      password: z.string().min(12).max(128),
    })
    .strict()
    .parse(JSON.parse(raw));
  raw = "";
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  try {
    const hash = await hashPassword(input.password);
    input.password = "";
    await drizzle(pool).transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(8675309)`);
      if (
        (await tx.select({ id: organization.id }).from(organization).limit(1))
          .length
      )
        throw new Error("Already initialized");
      const organizationId = crypto.randomUUID();
      const id = crypto.randomUUID();
      await tx
        .insert(organization)
        .values({ id: organizationId, name: input.organizationName });
      await tx.insert(user).values({
        id,
        organizationId,
        name: input.name,
        username: input.username,
        displayUsername: input.username,
        email: `${id}@accounts.invalid`,
        role: "ADMIN",
        status: "PENDING",
        mustChangePassword: true,
      });
      await tx.insert(account).values({
        id: crypto.randomUUID(),
        userId: id,
        accountId: id,
        providerId: "credential",
        password: hash,
      });
      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        organizationId,
        actorId: id,
        action: "INITIAL_ADMIN_CREATED",
        resourceType: "USER",
        resourceId: id,
        result: "SUCCESS",
      });
    });
    console.log(
      "Initial administrator created. Password change and TOTP enrollment are required on first login.",
    );
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Bootstrap failed. Check input, migration state, database access, and whether initialization has already run. Credentials are never printed.",
  );
  process.exitCode = 1;
});
