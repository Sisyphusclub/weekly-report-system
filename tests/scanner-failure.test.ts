import net from "node:net";
import { once } from "node:events";
import { afterEach, expect, it, vi } from "vitest";
import { POST } from "../src/app/api/internal/attachment-scan/route";

const state = vi.hoisted(() => ({ url: "" }));
vi.mock("@/lib/config", () => ({
  getConfig: () => ({ CLAMAV_URL: state.url }),
  configurationStatus: () => ({
    ready: true,
    config: { ATTACHMENT_SCANNER_TOKEN: "test-only-token" },
  }),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it.each(["disconnect", "invalid-verdict"])(
  "fails closed on scanner %s",
  async (mode) => {
    const sockets = new Set<net.Socket>();
    const server = net.createServer((socket) => {
      sockets.add(socket);
      socket.on("error", () => {});
      socket.on("close", () => sockets.delete(socket));
      socket.once("data", () => {
        if (mode === "disconnect") socket.destroy();
        else socket.end("unexpected stream: OK suffix\0");
      });
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    state.url = `tcp://127.0.0.1:${(server.address() as net.AddressInfo).port}`;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("test file")),
    );
    try {
      const response = await POST(
        new Request("http://localhost/api/internal/attachment-scan", {
          method: "POST",
          headers: {
            authorization: "Bearer test-only-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            downloadUrl: "http://storage.invalid/file",
            sizeBytes: 9,
          }),
        }),
      );
      expect([200, 503]).toContain(response.status);
      expect((await response.json()).clean).toBe(false);
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
  5000,
);

it("does not contact the scanner when the object cannot be downloaded", async () => {
  const connect = vi.spyOn(net, "createConnection");
  state.url = "tcp://127.0.0.1:1";
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
  );
  const response = await POST(
    new Request("http://localhost/api/internal/attachment-scan", {
      method: "POST",
      headers: {
        authorization: "Bearer test-only-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ downloadUrl: "http://storage.invalid/missing" }),
    }),
  );
  expect(response.status).toBe(503);
  expect((await response.json()).clean).toBe(false);
  expect(connect).not.toHaveBeenCalled();
});
