import net from "node:net";
import { configurationStatus, getConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(message: string, status = 503) {
  return Response.json({ clean: false, message }, { status });
}

async function scanWithClamd(url: string, contentLength?: number) {
  const target = new URL(getConfig().CLAMAV_URL!);
  if (target.protocol !== "tcp:") throw new Error("CLAMAV_URL must use tcp://");
  const socket = net.createConnection({
    host: target.hostname,
    port: Number(target.port || 3310),
  });
  const result = new Promise<string>((resolve, reject) => {
    let output = "";
    socket.setTimeout(15_000, () => {
      socket.destroy();
      reject(new Error("ClamAV timeout"));
    });
    socket.on("data", (chunk) => {
      output += chunk.toString("utf8");
      if (output.includes("\0") || output.includes("\n")) {
        socket.end();
        resolve(output);
      }
    });
    socket.on("error", reject);
    socket.on("end", () => resolve(output));
    socket.on("connect", () => socket.write("zINSTREAM\0"));
  });
  const body = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!body.ok || !body.body) throw new Error("无法读取待扫描对象");
  const reader = body.body.getReader();
  let total = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > 25 * 1024 * 1024) throw new Error("附件超过扫描上限");
      const header = Buffer.alloc(4);
      header.writeUInt32BE(part.value.byteLength);
      if (!socket.write(Buffer.concat([header, Buffer.from(part.value)])))
        await new Promise<void>((resolve) => socket.once("drain", resolve));
    }
    socket.write(Buffer.alloc(4));
    const verdict = await result;
    if (!verdict.includes("stream: OK")) return { clean: false };
    if (contentLength !== undefined && total !== contentLength)
      throw new Error("扫描对象大小发生变化");
    return { clean: true };
  } finally {
    reader.releaseLock();
    socket.destroy();
  }
}

export async function POST(request: Request) {
  const configStatus = configurationStatus();
  if (!configStatus.ready) return fail("服务未配置完成");
  const config = configStatus.config;
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (
    !config.ATTACHMENT_SCANNER_TOKEN ||
    supplied !== config.ATTACHMENT_SCANNER_TOKEN
  )
    return fail("未授权", 401);
  const body = (await request.json().catch(() => null)) as {
    downloadUrl?: unknown;
    sizeBytes?: unknown;
  } | null;
  if (
    !body ||
    typeof body.downloadUrl !== "string" ||
    !/^https?:\/\//.test(body.downloadUrl)
  )
    return fail("扫描参数无效", 400);
  try {
    return Response.json(
      await scanWithClamd(
        body.downloadUrl,
        typeof body.sizeBytes === "number" ? body.sizeBytes : undefined,
      ),
    );
  } catch {
    return fail("附件扫描服务不可用");
  }
}
