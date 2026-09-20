import { AuditPage } from "@/components/workspace/audit-page";
import { TeamActivityPage } from "@/components/workspace/team-activity-page";
import { requireUser } from "@/lib/access";

export const metadata = { title: "团队动态" };
export default async function ActivityPage(props: {
  searchParams: Promise<{ page?: string; resourceId?: string }>;
}) {
  const actor = await requireUser();
  if (actor.role === "BOSS") return <AuditPage {...props} business />;
  if (actor.role === "EMPLOYEE") {
    return <TeamActivityPage searchParams={props.searchParams} />;
  }
  return <AuditPage {...props} business />;
}
