import { spawn } from "node:child_process";
import { join } from "node:path";
import { BusinessError } from "./api";

const errors: Record<string, string> = {
  NO_SHEET: "Excel 文件没有工作表",
  TOO_MANY_COLUMNS: "Excel 列数过多，请使用任务导入模板",
  TOO_MANY_ROWS: "每次最多导入 200 条任务，请拆分文件后重试",
  INVALID_FILE: "无法读取 Excel 文件，请确认文件完整且未加密",
};
let activeParsers = 0;

export async function parseTaskExcel(bytes: ArrayBuffer, timeoutMs = 15_000) {
  if (bytes.byteLength > 10 * 1024 * 1024)
    throw new BusinessError("Excel 文件不能超过 10 MB", 413);
  if (activeParsers >= 2)
    throw new BusinessError("正在处理其他导入，请稍后重试", 429);
  activeParsers++;
  try {
    return await new Promise<Record<string, unknown>[]>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          "--max-old-space-size=128",
          join(process.cwd(), "scripts/parse-task-excel.mjs"),
        ],
        {
          env: { NODE_ENV: "production" },
          stdio: ["ignore", "ignore", "ignore", "ipc"],
          serialization: "advanced",
        },
      );
      let result: Record<string, unknown>[] | undefined;
      let failure: Error | undefined;
      const timer = setTimeout(() => {
        failure = new BusinessError("Excel 解析超时，请简化文件后重试", 413);
        child.kill();
      }, timeoutMs);
      child.on(
        "message",
        (message: { rows?: Record<string, unknown>[]; error?: string }) => {
          if (failure || result) return;
          if (message.error || !Array.isArray(message.rows))
            failure = new BusinessError(
              errors[message.error ?? ""] ?? errors.INVALID_FILE,
            );
          else result = message.rows;
          child.kill();
        },
      );
      child.on("error", () => {
        failure = new BusinessError("Excel 解析服务不可用，请稍后重试", 503);
      });
      child.on("close", () => {
        clearTimeout(timer);
        if (failure) reject(failure);
        else if (result) resolve(result);
        else
          reject(
            new BusinessError("Excel 解析超出资源限制，请简化文件后重试", 413),
          );
      });
      child.send(Buffer.from(bytes), (error) => {
        if (error) {
          failure = new BusinessError("Excel 解析服务不可用，请稍后重试", 503);
          child.kill();
        }
      });
    });
  } finally {
    activeParsers--;
  }
}
