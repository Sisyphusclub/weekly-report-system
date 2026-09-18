import { spawn } from "node:child_process";

const database = process.argv[2];
if (
  process.env.APP_ENV !== "development" ||
  !/^restore_target_[a-f0-9]{32}_test$/.test(database ?? "") ||
  !process.env.POSTGRES_PASSWORD
) {
  throw new Error("An isolated local restore target is required");
}
// Match the local development Compose service, never a remote DATABASE_URL.
const target = new URL("postgresql://weekly@127.0.0.1:55432/");
target.password = process.env.POSTGRES_PASSWORD;
target.pathname = `/${database}`;
const child = spawn(
  process.execPath,
  ["--import", "tsx", "scripts/test-database.ts"],
  {
    env: { ...process.env, TEST_DATABASE_URL: target.href },
    stdio: "inherit",
  },
);
child.on("error", () => {
  console.error("Could not start restored database verification");
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
