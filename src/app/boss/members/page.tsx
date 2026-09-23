import { requireUser } from "@/lib/access";
import { getDashboardBreakdown } from "@/lib/metrics";
import { getSubmissionData } from "@/lib/submission-data";
import { WorkspaceShell } from "@/components/workspace/shell";
import { MemberCompareCard } from "@/components/dashboard/member-compare-card";
import { PageHeading } from "@/components/dashboard/page-heading";

export const metadata = { title: "老板端 · 成员视角" };
export default async function BossMembersPage() {
  const actor = await requireUser();
  const data = await getSubmissionData(actor, new Date());
  const breakdown = await getDashboardBreakdown(actor, new Date(), data);
  return (
    <WorkspaceShell actor={actor} selected="members">
      <PageHeading
        eyebrow="团队视角"
        title="成员双栏看板"
        description="逐人对照今日实际交付与早晨计划，快速定位偏差和卡点。"
      />
      <div className="grid gap-4 md:grid-cols-2">
        {breakdown.members.map((member) => (
          <MemberCompareCard
            key={member.id}
            member={member}
            plans={breakdown.projects
              .flatMap((project) =>
                project.nextPlans
                  .slice(0, 1)
                  .map((plan) => ({
                    content: plan.content,
                    projectName: project.name,
                    status: "TODO" as const,
                  })),
              )
              .slice(0, 2)}
            hasRisk={member.openBlockers > 0}
          />
        ))}
      </div>
    </WorkspaceShell>
  );
}
