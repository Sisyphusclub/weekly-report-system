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
      mustChangePassword: user.mustChangePassword,
      twoFactorEnabled: user.twoFactorEnabled,
    })
    .from(user)
    .innerJoin(organization, eq(organization.id, user.organizationId))
    .where(eq(user.id, session.user.id))
    .limit(1);
  if (!actor || actor.status === "DISABLED" || actor.status === "LOCKED")
    return null;
  return actor;
}

export async function requireUser(
  options: { allowSecuritySetup?: boolean } = {},
) {
  const actor = await currentUser();
  if (!actor) redirect("/login");
  if (
    !options.allowSecuritySetup &&
    (actor.mustChangePassword ||
      (actor.role !== "EMPLOYEE" && !actor.twoFactorEnabled))
  )
    redirect("/security");
  return actor;
}
