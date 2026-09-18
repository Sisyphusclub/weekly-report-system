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
  it("accepts complete production storage config", () =>
    expect(
      configurationStatus({
        ...env,
        APP_ENV: "production",
        BETTER_AUTH_URL: "https://reports.example",
        S3_ENDPOINT: "https://s3.example",
        S3_REGION: "us-east-1",
        S3_BUCKET: "weekly",
        S3_ACCESS_KEY_ID: "access",
        S3_SECRET_ACCESS_KEY: "secret",
        ATTACHMENT_SCANNER_URL: "https://scanner.example/scan",
        ATTACHMENT_SCANNER_TOKEN: "",
        CLAMAV_URL: "tcp://clamav.example:3310",
      }).ready,
    ).toBe(true));
  it("treats blank optional development values as unset", () => {
    const result = configurationStatus({
      ...env,
      S3_ENDPOINT: "",
      S3_REGION: "",
      S3_BUCKET: "",
      S3_ACCESS_KEY_ID: "",
      S3_SECRET_ACCESS_KEY: "",
      ATTACHMENT_SCANNER_URL: "",
      ATTACHMENT_SCANNER_TOKEN: "",
    });
    expect(result.ready).toBe(true);
    if (result.ready) {
      expect(result.config.ATTACHMENT_SCANNER_TOKEN).toBeUndefined();
      expect(result.config.S3_ENDPOINT).toBeUndefined();
    }
  });
  it("requires ClamAV in non-development environments", () => {
    const result = configurationStatus({
      ...env,
      APP_ENV: "production",
      BETTER_AUTH_URL: "https://reports.example",
      S3_ENDPOINT: "https://s3.example",
      S3_REGION: "us-east-1",
      S3_BUCKET: "weekly",
      S3_ACCESS_KEY_ID: "access",
      S3_SECRET_ACCESS_KEY: "secret",
      ATTACHMENT_SCANNER_URL: "https://scanner.example/scan",
    });
    expect(result.ready).toBe(false);
    if (!result.ready) expect(result.fields).toContain("CLAMAV_URL");
  });
  it.each(["production", "staging"])(
    "still rejects blank required infrastructure in %s",
    (APP_ENV) => {
      const result = configurationStatus({
        ...env,
        APP_ENV,
        BETTER_AUTH_URL: "https://reports.example",
        S3_ENDPOINT: "",
        ATTACHMENT_SCANNER_URL: "",
      });
      expect(result.ready).toBe(false);
      if (!result.ready)
        expect(result.fields).toEqual(
          expect.arrayContaining(["S3_ENDPOINT", "ATTACHMENT_SCANNER_URL"]),
        );
    },
  );
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
  it("reports missing field names without environment values", () => {
    const result = configurationStatus({
      DATABASE_URL: "postgresql://private-host/private-db",
      BETTER_AUTH_SECRET: "private-secret-value",
      APP_ENV: "production",
    });
    expect(result.ready).toBe(false);
    expect(JSON.stringify(result)).not.toContain("private-host");
    expect(JSON.stringify(result)).not.toContain("private-secret-value");
    if (!result.ready) expect(result.fields).toContain("BETTER_AUTH_URL");
  });
});
