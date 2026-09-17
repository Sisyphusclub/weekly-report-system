import { closePool } from "../src/lib/db/index.js";

export async function runJob(name: string, action: () => Promise<void>) {
  try {
    await action();
  } catch {
    console.error(
      `${name} failed. Check configuration and service availability.`,
    );
    process.exitCode = 1;
  } finally {
    try {
      await closePool();
    } catch {
      console.error(`${name}: database connection cleanup failed.`);
      process.exitCode = 1;
    }
  }
}
