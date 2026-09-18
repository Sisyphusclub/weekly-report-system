import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { Pool } from "pg";
const base = process.env.DATABASE_URL;
if (!base || process.env.APP_ENV !== "development")
  throw new Error("Development database required");
const admin = new Pool({ connectionString: base, max: 1 });
const name = `browser_${randomUUID().replaceAll("-", "")}_test`;
const target = new URL(base);
target.pathname = `/${name}`;
const origin = "http://127.0.0.1:3201";
const env = {
  ...process.env,
  DATABASE_URL: target.href,
  BETTER_AUTH_URL: origin,
  BROWSER_TEST_BUILD: "1",
};
let server: ReturnType<typeof spawn> | undefined;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3201",
    ],
    { env, stdio: "ignore" },
  );
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error("Test server exited");
    try {
      const response = await fetch(`${origin}/login`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error("Test server not ready");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "scripts/migrate.ts"],
      { env, stdio: "inherit" },
    );
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error("browser database migration failed")),
    );
  });
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "scripts/test-browser-login.ts"],
      { env, stdio: "inherit" },
    );
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error("browser verification failed")),
    );
  });
} finally {
  if (server?.pid) {
    if (process.platform === "win32")
      await new Promise<void>((resolve) => {
        const stop = spawn(
          "taskkill",
          ["/PID", String(server!.pid), "/T", "/F"],
          { stdio: "ignore" },
        );
        stop.on("exit", () => resolve());
      });
    else server.kill();
  }
  await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
}
