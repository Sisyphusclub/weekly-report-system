import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  config: vi.fn(),
  sign: vi.fn(),
}));
vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const original = await importOriginal<typeof import("@aws-sdk/client-s3")>();
  return {
    ...original,
    S3Client: class {
      send = mocks.send;
    },
  };
});
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: mocks.sign }));
vi.mock("../src/lib/config", () => ({ getConfig: mocks.config }));
import { scanObject, verifyObject } from "../src/lib/storage";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.config.mockReturnValue({
    S3_ENDPOINT: "https://storage.invalid",
    S3_REGION: "test",
    S3_BUCKET: "test",
    S3_ACCESS_KEY_ID: "test",
    S3_SECRET_ACCESS_KEY: "test",
    ATTACHMENT_SCANNER_URL: "https://scanner.invalid/scan",
  });
  mocks.sign.mockResolvedValue("https://storage.invalid/private-download");
});
afterEach(() => vi.unstubAllGlobals());

function object(bytes: number[], size = bytes.length) {
  mocks.send.mockResolvedValueOnce({
    ContentLength: size,
    ChecksumSHA256: "hash",
  });
  mocks.send.mockResolvedValueOnce({
    Body: { transformToByteArray: async () => new Uint8Array(bytes) },
  });
}
describe("object verification", () => {
  it.each([[], [137], [137, 80, 78, 71]])(
    "rejects incomplete PNG data %j",
    async (...args) => {
      const bytes = args as number[];
      object(bytes);
      await expect(
        verifyObject("key", bytes.length, "hash", "image/png"),
      ).rejects.toThrow();
    },
  );
  it("rejects a missing object body", async () => {
    mocks.send
      .mockResolvedValueOnce({ ContentLength: 16, ChecksumSHA256: "hash" })
      .mockResolvedValueOnce({});
    await expect(verifyObject("key", 16, "hash", "image/png")).rejects.toThrow(
      "读取不完整",
    );
  });
  it("accepts a complete PNG signature", async () => {
    object([137, 80, 78, 71, 13, 10, 26, 10]);
    await expect(
      verifyObject("key", 8, "hash", "image/png"),
    ).resolves.toBeUndefined();
  });
  it("rejects short reads even with matching head metadata", async () => {
    object([137, 80, 78, 71, 13, 10, 26, 10], 100);
    await expect(verifyObject("key", 100, "hash", "image/png")).rejects.toThrow(
      "读取不完整",
    );
  });
  it("does not treat unsupported types as text", async () => {
    object([65]);
    await expect(
      verifyObject("key", 1, "hash", "application/javascript"),
    ).rejects.toThrow();
  });
  it.each([
    { ContentLength: 2, ChecksumSHA256: "hash" },
    { ContentLength: 1 },
    { ContentLength: 1, ChecksumSHA256: "wrong" },
  ])("rejects invalid metadata before reading content", async (metadata) => {
    mocks.send.mockResolvedValueOnce(metadata);
    await expect(
      verifyObject("key", 1, "hash", "text/plain"),
    ).rejects.toThrow();
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
});
describe("scanner contract", () => {
  const input = {
    key: "key",
    fileName: "file.txt",
    contentType: "text/plain",
    sizeBytes: 1,
    sha256: "hash",
  };
  it.each([false, "true", null, undefined])(
    "rejects non-clean results %s",
    async (clean) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(Response.json({ clean })),
      );
      await expect(scanObject(input)).rejects.toThrow("未通过安全扫描");
    },
  );
  it("accepts an explicit clean result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ clean: true })),
    );
    await expect(scanObject(input)).resolves.toEqual({ configured: true });
  });
  it("rejects service failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    );
    await expect(scanObject(input)).rejects.toThrow("服务不可用");
  });
});
