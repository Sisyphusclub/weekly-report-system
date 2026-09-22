"use client";

import { CircleAlert, CircleCheck, ListChecks, UsersRound } from "lucide-react";
import { memo } from "react";
import { CompactCard } from "@/components/premium/cards/compact-card";
import { EmptyStateBoard } from "@/components/premium/empty-states/empty-state-board";

export type CollaborationProject = {
  id: string;
  name: string;
  completed: number;
  inProgress: number;
  blocked: number;
  owner: { id: string; name: string } | null;
  members: Array<{ id: string; name: string }>;
  nextPlans: Array<{ id: string; content: string; assigneeId: string }>;
  deliverables: Array<{ unitId: string; unitName: string; quantity: number }>;
};

type LaneKey = "risk" | "active" | "done";

const lanes: Array<{
  key: LaneKey;
  label: string;
  description: string;
}> = [
  { key: "risk", label: "需要关注", description: "存在阻塞，优先协调" },
  { key: "active", label: "推进中", description: "本周仍有进行中事项" },
  { key: "done", label: "进展稳定", description: "当前没有待处理阻塞" },
];

export function ProjectCollaborationBoard({
  projects,
}: {
  projects: CollaborationProject[];
}) {
  if (projects.length === 0) {
    return (
      <div className="border-y border-border">
        <EmptyStateBoard
          title="还没有项目"
          description="项目创建后，成员进展、交付物和阻塞会在这里统一呈现。"
        />
      </div>
    );
  }

  const groups = new Map<LaneKey, CollaborationProject[]>([
    ["risk", []],
    ["active", []],
    ["done", []],
  ]);
  for (const project of projects)
    groups.get(projectLane(project))?.push(project);

  const completed = projects.reduce(
    (sum, project) => sum + project.completed,
    0,
  );
  const active = projects.reduce((sum, project) => sum + project.inProgress, 0);
  const blocked = projects.reduce((sum, project) => sum + project.blocked, 0);

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-3 divide-x divide-border border-y border-border">
        <Metric label="已完成" value={completed} />
        <Metric label="进行中" value={active} />
        <Metric label="阻塞" value={blocked} danger={blocked > 0} />
      </dl>

      <div className="grid divide-y divide-border border-y border-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {lanes.map((lane) => {
          const items = groups.get(lane.key) ?? [];
          return (
            <section key={lane.key} className="min-w-0 px-3 py-4 sm:px-4">
              <header className="mb-4 flex min-h-11 items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    {lane.label}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {lane.description}
                  </p>
                </div>
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                  {items.length}
                </span>
              </header>

              <div className="space-y-3">
                {items.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    lane={lane.key}
                  />
                ))}
                {items.length === 0 ? (
                  <div className="grid min-h-32 place-items-center border border-dashed border-border px-4 text-center text-xs text-muted-foreground">
                    当前没有项目
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

const ProjectCard = memo(function ProjectCard({
  project,
  lane,
}: {
  project: CollaborationProject;
  lane: LaneKey;
}) {
  const status =
    lane === "risk" ? "需要协调" : lane === "active" ? "推进中" : "进展稳定";
  const footerLabel = project.deliverables.length
    ? project.deliverables
        .slice(0, 2)
        .map((item) => `${item.unitName} ${item.quantity}`)
        .join(" · ")
    : (project.nextPlans[0]?.content ?? "暂无新增交付");

  return (
    <CompactCard
      status={status}
      title={project.name}
      description={`负责人：${project.owner?.name ?? "未设置"} · 已完成 ${project.completed} 项`}
      details={[
        { icon: UsersRound, label: `${project.members.length} 人协同` },
        lane === "risk"
          ? { icon: CircleAlert, label: `${project.blocked} 项阻塞` }
          : lane === "active"
            ? { icon: ListChecks, label: `${project.inProgress} 项进行中` }
            : { icon: CircleCheck, label: "暂无阻塞" },
      ]}
      footerLabel={footerLabel}
      people={project.members.map((member) => ({ name: member.name }))}
      peopleCount={project.members.length}
      actionLabel="查看报告"
      href={`/reports?project=${project.id}`}
      texture={<ProgressTexture project={project} />}
      className="max-w-none"
    />
  );
});

function ProgressTexture({ project }: { project: CollaborationProject }) {
  const segments = [
    {
      label: "完成",
      value: project.completed,
      className: "bg-primary",
    },
    {
      label: "进行中",
      value: project.inProgress,
      className: "bg-amber-700",
    },
    {
      label: "阻塞",
      value: project.blocked,
      className: "bg-destructive",
    },
  ];

  return (
    <div className="flex size-full items-end gap-1 bg-muted px-4 pb-4">
      {segments.map((segment) =>
        segment.value > 0 ? (
          <span
            key={segment.label}
            title={`${segment.label} ${segment.value}`}
            className={`h-2 rounded-sm ${segment.className}`}
            style={{ flexBasis: 0, flexGrow: segment.value }}
          />
        ) : null,
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          danger
            ? "mt-1 text-xl font-semibold text-destructive"
            : "mt-1 text-xl font-semibold text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function projectLane(project: CollaborationProject): LaneKey {
  if (project.blocked > 0) return "risk";
  if (project.inProgress > 0 || project.nextPlans.length > 0) return "active";
  return "done";
}
