import { configurationStatus } from "@/lib/config";
import { getPool } from "@/lib/db";
import { checkStorage } from "@/lib/storage";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!configurationStatus().ready)
    return Response.json({ status: "not_ready" }, { status: 503 });
  try {
    await getPool().query("SELECT 1");
    if (process.env.APP_ENV !== "development") await checkStorage();
    return Response.json({ status: "ready" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
