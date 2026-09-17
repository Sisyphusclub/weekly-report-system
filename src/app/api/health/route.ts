import { configurationStatus } from "@/lib/config";
import { getPool } from "@/lib/db";
import { checkStorage } from "@/lib/storage";
export const dynamic = "force-dynamic";
function health(body: { status: string }, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
export async function GET() {
  if (!configurationStatus().ready) return health({ status: "not_ready" }, 503);
  try {
    await getPool().query("SELECT 1");
    if (process.env.APP_ENV !== "development") await checkStorage();
    return health({ status: "ready" });
  } catch {
    return health({ status: "unavailable" }, 503);
  }
}
