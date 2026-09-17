import { describe, it, expect } from "vitest";
import { configurationStatus } from "@/lib/config";

const env = {
  DATABASE_URL: "postgresql://localhost/test",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "x".repeat(32),
  APP_ENV: "development",
};
describe("runtime configuration", () => {
  it("fails closed without a database or secret", () =>
    expect(configurationStatus({}).ready).toBe(false));
  it("permits explicit local development config", () =>
    expect(configurationStatus(env).ready).toBe(true));
  it.each(["production", "staging"])("requires HTTPS in %s", (APP_ENV) =>
    expect(configurationStatus({ ...env, APP_ENV }).ready).toBe(false),
  );
  it("requires object storage outside development", () =>
    expect(
      configurationStatus({
        ...env,
        APP_ENV: "production",
        BETTER_AUTH_URL: "https://reports.example",
      }).ready,
    ).toBe(false));
  it("rejects a non-PostgreSQL URL", () =>
    expect(
      configurationStatus({ ...env, DATABASE_URL: "https://example.com" })
        .ready,
    ).toBe(false));
  it("does not disclose invalid credential values", () =>
    expect(
      JSON.stringify(
        configurationStatus({ ...env, BETTER_AUTH_SECRET: "private-value" }),
      ),
    ).not.toContain("private-value"));
});
