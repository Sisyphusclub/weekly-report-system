import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { closePool } = vi.hoisted(() => ({ closePool: vi.fn() }));
vi.mock("../src/lib/db/index.js", () => ({ closePool }));
import { runJob } from "../scripts/run-job";

const originalExitCode = process.exitCode;
beforeEach(() => {
  process.exitCode = 0;
  closePool.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
});
it("releases the pool after successful work", async () => {
  const action = vi.fn().mockResolvedValue(undefined);
  await runJob("Test", action);
  expect(action).toHaveBeenCalledOnce();
  expect(closePool).toHaveBeenCalledOnce();
  expect(process.exitCode).toBe(0);
});
it("releases the pool on failure without printing sensitive error details", async () => {
  await runJob("Test", async () => {
    throw new Error("postgresql://user:private-password@host/db");
  });
  expect(closePool).toHaveBeenCalledOnce();
  expect(process.exitCode).toBe(1);
  expect(console.error).toHaveBeenCalledWith(
    "Test failed. Check configuration and service availability.",
  );
});
it("returns a failure exit code if connection cleanup fails", async () => {
  closePool.mockRejectedValue(new Error("sensitive connection details"));
  await runJob("Test", async () => undefined);
  expect(process.exitCode).toBe(1);
  expect(console.error).toHaveBeenCalledWith(
    "Test: database connection cleanup failed.",
  );
});
