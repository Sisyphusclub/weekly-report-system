import { getAuth } from "@/lib/auth";
import { configurationStatus } from "@/lib/config";
import { guardUsernameLogin } from "@/lib/login-guard";

export const runtime = "nodejs";
const allowedGet = new Set(["get-session"]);
const allowedPost = new Set([
  "sign-in/username",
  "sign-out",
  "change-password",
  "two-factor/enable",
  "two-factor/verify-totp",
  "two-factor/verify-backup-code",
  "revoke-sessions",
]);

async function handler(request: Request) {
  const path = new URL(request.url).pathname.replace(/^\/api\/auth\//, "");
  if (!(request.method === "GET" ? allowedGet : allowedPost).has(path))
    return Response.json({ message: "接口不可用" }, { status: 404 });
  if (!configurationStatus().ready)
    return Response.json(
      { message: "服务尚未配置完成，请联系管理员" },
      { status: 503 },
    );
  try {
    return path === "sign-in/username"
      ? await guardUsernameLogin(request, () => getAuth().handler(request))
      : await getAuth().handler(request);
  } catch {
    console.error("AUTH_SERVICE_UNAVAILABLE");
    return Response.json(
      { message: "认证服务暂不可用，请稍后重试" },
      { status: 503 },
    );
  }
}
export const GET = handler;
export const POST = handler;
