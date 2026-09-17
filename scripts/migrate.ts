import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  try {
    const client = await pool.connect();
    try {
      // A session lock spans the migrator's own transactions and releases on disconnect.
      await client.query("SELECT pg_advisory_lock(731982, 1)");
      try {
        await migrate(drizzle(client), {
          migrationsFolder: fileURLToPath(
            new URL("../drizzle/", import.meta.url),
          ),
        });
        console.log("Database migrations applied.");
      } finally {
        await client.query("SELECT pg_advisory_unlock(731982, 1)");
      }
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Migration failed. Check database availability, migration SQL and permissions; no credentials have been logged.",
  );
  process.exitCode = 1;
});
