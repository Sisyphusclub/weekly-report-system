import { requireUser } from "@/lib/access";
import { getDashboardBreakdown } from "@/lib/metrics";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ProjectCollaborationBoard } from "@/components/dashboard/project-collaboration-board";
import { PageHeading } from "@/components/dashboard/page-heading";

export const metadata = { title: "项目看板" };

export default async function ProjectsPage() {
  const actor = await requireUser();
  const breakdown = await getDashboardBreakdown(actor, new Date());
  return (
    <WorkspaceShell actor={actor} selected="projects">
      <PageHeading
        eyebrow="工作区"
        title="项目看板"
        description="查看你参与的项目进展、交付物和待协调事项。"
      />
      <ProjectCollaborationBoard projects={breakdown.projects} />
    </WorkspaceShell>
  );
}
