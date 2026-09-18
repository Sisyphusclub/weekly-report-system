import { requireUser } from "@/lib/access";
import { getDashboardBreakdown } from "@/lib/metrics";
import { getSubmissionData } from "@/lib/submission-data";
import { WorkspaceShell } from "@/components/workspace/shell";
import { ProjectCollabCard } from "@/components/dashboard/project-collab-card";
import { PageHeading } from "@/components/dashboard/page-heading";

export const metadata = { title: "老板端 · 项目协同" };
export default async function BossProjectsPage() {
  const actor = await requireUser();
  const data = await getSubmissionData(actor, new Date());
  const breakdown = await getDashboardBreakdown(actor, new Date(), data);
  return <WorkspaceShell actor={actor} selected="projects"><PageHeading eyebrow="团队视角" title="项目协同看板" description="按项目聚合跨成员贡献、交付物和待处理阻塞。" /><div className="space-y-3">{breakdown.projects.map((project) => <ProjectCollabCard key={project.id} project={project} />)}</div></WorkspaceShell>;
}
