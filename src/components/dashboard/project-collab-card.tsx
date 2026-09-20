import { RiAlertLine, RiArrowDownSLine } from "@remixicon/react";
import { Badge } from "@/components/premium/badge";
import { Avatar } from "@/components/premium/avatar";

export function ProjectCollabCard({
  project,
}: {
  project: {
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
}) {
  return (
    <details className="group rounded-xl border border-slate-200/80 bg-white shadow-xs">
      <summary className="flex cursor-pointer list-none items-center gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold leading-6">{project.name}</h3>
            {project.blocked > 0 && (
              <RiAlertLine
                className="size-4 shrink-0 text-rose-700"
                aria-label="项目存在阻塞"
              />
            )}
          </div>
          <p className="mt-1 text-xs font-normal leading-4 text-slate-500">
            负责人：{project.owner?.name ?? "未设置"}
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {project.members.slice(0, 4).map((member, index) => (
            <Avatar
              key={member.id}
              initials={member.name.slice(0, 1)}
              color={index % 2 ? "success" : "info"}
              size="sm"
              className={
                index > 0 ? "-ml-2 ring-2 ring-white" : ""
              }
            />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs font-medium leading-4 text-slate-500">
          <span>{project.completed} 完成</span>
          <span>·</span>
          <span className={project.blocked ? "text-rose-700" : ""}>
            {project.blocked} 阻塞
          </span>
          <RiArrowDownSLine
            className="size-4 transition-transform group-open:rotate-180"
            aria-hidden
          />
        </div>
      </summary>
      <div className="grid gap-5 border-t border-slate-200 px-5 py-4 md:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold leading-4 text-slate-500">
            成员协同
          </h4>
          <ul className="mt-3 space-y-2">
            {project.members.length ? (
              project.members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-2 text-sm font-normal leading-5"
                >
                  <Avatar
                    initials={member.name.slice(0, 1)}
                    color="neutral"
                    size="xs"
                  />
                  <span>{member.name}</span>
                </li>
              ))
            ) : (
              <li className="text-xs font-normal leading-4 text-slate-500">
                暂无协同成员
              </li>
            )}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold leading-4 text-slate-500">
            今日项目计划
          </h4>
          <ul className="mt-3 space-y-2">
            {project.nextPlans.slice(0, 4).map((plan) => (
              <li key={plan.id} className="break-words text-sm font-normal leading-5">
                {plan.content}
              </li>
            ))}
            {!project.nextPlans.length && (
              <li className="text-xs font-normal leading-4 text-slate-500">
                暂无计划
              </li>
            )}
          </ul>
        </div>
        {project.deliverables.length > 0 && (
          <div className="md:col-span-2">
            <div className="flex flex-wrap gap-2">
              {project.deliverables.map((item) => (
                <Badge key={item.unitId} variant="caption" color="info">
                  {item.unitName} {item.quantity}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

