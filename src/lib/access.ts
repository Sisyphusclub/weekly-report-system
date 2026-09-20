import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { organization, user } from "@/lib/db/schema";
import { configurationStatus } from "@/lib/config";

export async function currentUser() {
  if (!configurationStatus().ready) return null;
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const [actor] = await getDb()
    .select({
      id: user.id,
      organizationId: user.organizationId,
      organizationName: organization.name,
      role: user.role,
      status: user.status,
      name: user.name,
      username: user.username,
    })
    .from(user)
    .innerJoin(organization, eq(organization.id, user.organizationId))
    .where(eq(user.id, session.user.id))
    .limit(1);
  if (!actor || actor.status === "DISABLED") return null;
  return actor;
}

export async function requireUser() {
  const actor = await currentUser();
  if (!actor) redirect("/login");
  return actor;
}
