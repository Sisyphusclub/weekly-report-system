import net from "node:net";
import { getConfig } from "@/lib/config";

function scannerAddress() {
  const value = getConfig().CLAMAV_URL;
  if (!value) throw new Error("ClamAV 未配置");
  const target = new URL(value);
  if (target.protocol !== "tcp:") throw new Error("CLAMAV_URL 必须使用 tcp://");
  return { host: target.hostname, port: Number(target.port || 3310) };
}

export async function checkClamav() {
  const { host, port } = scannerAddress();
  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let output = "";
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("ClamAV 连接超时"));
    }, 5000);
    socket.on("connect", () => socket.write("PING\n"));
    socket.on("data", (chunk) => {
      output += chunk.toString("utf8");
      if (output.includes("PONG")) {
        clearTimeout(timer);
        socket.end();
        resolve();
      }
    });
    socket.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    socket.on("close", () => {
      clearTimeout(timer);
      if (!output.includes("PONG")) reject(new Error("ClamAV 未响应"));
    });
  });
}

export function clamdTarget() {
  return scannerAddress();
}
