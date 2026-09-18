import { configurationStatus } from "@/lib/config";
import { getPool } from "@/lib/db";
import { checkStorage } from "@/lib/storage";
export const dynamic = "force-dynamic";
function health(body: Record<string, string>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
export async function GET() {
  if (!configurationStatus().ready)
    return health(
      { status: "not_ready", database: "not_checked", storage: "not_checked" },
      503,
    );
  let database = "ready";
  let storage = process.env.APP_ENV === "development" ? "skipped" : "ready";
  try {
    await getPool().query("SELECT 1");
  } catch {
    database = "unavailable";
  }
  if (database === "ready" && process.env.APP_ENV !== "development") {
    try {
      await checkStorage();
    } catch {
      storage = "unavailable";
    }
  }
  if (database !== "ready" || storage === "unavailable") {
    return health({ status: "unavailable", database, storage }, 503);
  }
  return health({ status: "ready", database, storage });
}
