import { requireUser } from "@/lib/access";
import { getDashboardBreakdown } from "@/lib/metrics";
import { getSubmissionData } from "@/lib/submission-data";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ProjectCollaborationBoard } from "@/components/dashboard/project-collaboration-board";
import { PageHeading } from "@/components/dashboard/page-heading";

export const metadata = { title: "老板端 · 项目协同" };
export default async function BossProjectsPage() {
  const actor = await requireUser();
  const data = await getSubmissionData(actor, new Date());
  const breakdown = await getDashboardBreakdown(actor, new Date(), data);
  return (
    <WorkspaceShell actor={actor} selected="projects">
      <PageHeading
        eyebrow="团队视角"
        title="项目协同"
        description="按项目查看成员贡献、交付物和待处理阻塞。"
      />
      <ProjectCollaborationBoard projects={breakdown.projects} />
    </WorkspaceShell>
  );
}
