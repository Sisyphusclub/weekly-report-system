import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { Pool } from "pg";

async function main() {
  if (process.env.APP_ENV !== "development" || !process.env.DATABASE_URL)
    throw new Error("Development database required");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const name = `auth_${randomUUID().replaceAll("-", "")}_test`;
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = `/${name}`;
  let created = false;
  async function run(script: string) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, ["--import", "tsx", script], {
        env: {
          ...process.env,
          DATABASE_URL: url.href,
          TEST_DATABASE_URL: url.href,
        },
        stdio: "inherit",
      });
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0 ? resolve() : reject(new Error("Integration stage failed")),
      );
    });
  }
  try {
    await pool.query(`CREATE DATABASE "${name}"`);
    created = true;
    await run("scripts/migrate.ts");
    await run("scripts/test-auth.ts");
  } finally {
    if (created) await pool.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Isolated authentication verification failed; credentials are not logged.",
  );
  process.exitCode = 1;
});
