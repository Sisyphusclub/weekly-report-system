import { describe, expect, it } from "vitest";
import { apiError, BusinessError, enforceRateLimit } from "@/lib/api";

describe("enforceRateLimit", () => {
  it("rejects requests after the configured limit", () => {
    const key = `test-${crypto.randomUUID()}`;
    enforceRateLimit(key, 2, 1_000, 100);
    enforceRateLimit(key, 2, 1_000, 200);
    expect(() => enforceRateLimit(key, 2, 1_000, 300)).toThrowError(
      new BusinessError("操作过于频繁，请稍后重试", 429),
    );
  });

  it("resets the counter after the window", () => {
    const key = `test-${crypto.randomUUID()}`;
    enforceRateLimit(key, 1, 1_000, 100);
    expect(() => enforceRateLimit(key, 1, 1_000, 1_100)).not.toThrow();
  });

  it("exposes a retry hint for throttled requests", async () => {
    const response = apiError(new BusinessError("操作过于频繁，请稍后重试", 429));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
  });
});
