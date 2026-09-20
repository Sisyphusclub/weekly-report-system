import {
  RiArrowRightSLine,
  RiCheckboxCircleLine,
  RiTimeLine,
} from "@remixicon/react";
import { Avatar } from "@/components/premium/avatar";
import { ButtonLink } from "@/components/motion/button/base";
import { Badge } from "@/components/premium/badge";
import { cx } from "@/utils/cx";
import { TaskItemRow, type WorkStatus } from "./task-item-row";

export function MemberCompareCard({
  member,
  plans,
  hasRisk = false,
}: {
  member: {
    id: string;
    name: string;
    submitted: number;
    due: number;
    openBlockers: number;
    completed: number;
  };
  plans: Array<{ content: string; projectName?: string; status: WorkStatus }>;
  hasRisk?: boolean;
}) {
  const fulfillment = member.due
    ? Math.min(100, Math.round((member.submitted / member.due) * 100))
    : 100;
  return (
    <article
      className={cx(
        "flex min-w-0 flex-col rounded-xl border bg-white p-5 shadow-xs",
        hasRisk ? "border-rose-200" : "border-slate-200/80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            initials={member.name.slice(0, 1)}
            color={hasRisk ? "neutral" : "info"}
            size="lg"
          />
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold leading-6">{member.name}</h3>
            <p className="mt-0.5 text-xs font-normal leading-4 text-slate-500">
              今日团队成员
            </p>
          </div>
        </div>
        <Badge
          variant="caption"
          color={
            hasRisk
              ? "danger"
              : member.submitted >= member.due && member.due > 0
                ? "success"
                : "warning"
          }
        >
          {hasRisk
            ? "有阻塞"
            : member.submitted >= member.due && member.due > 0
              ? "按时提交"
              : "待跟进"}
        </Badge>
      </div>
      {hasRisk && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium leading-4 text-rose-700">
          <RiTimeLine className="mt-0.5 size-4 shrink-0" aria-hidden />
          {member.openBlockers} 项阻塞需要协调
        </div>
      )}
      <div className="mt-5 grid min-w-0 grid-cols-2 gap-4">
        <section className="min-w-0 border-r border-slate-200 pr-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold leading-4 text-slate-500">
              今日实际
            </h4>
            <RiCheckboxCircleLine
              className="size-4 text-emerald-700"
              aria-hidden
            />
          </div>
          {member.completed > 0 ? (
            <TaskItemRow
              index={0}
              content={`已完成 ${member.completed} 项工作`}
              category="实际"
              status="DONE"
              deliverableText={`${member.completed} 项`}
            />
          ) : (
            <p className="py-3 text-xs font-normal leading-4 text-slate-500">
              尚未记录实际工作
            </p>
          )}
        </section>
        <section className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold leading-4 text-slate-500">
              今日计划
            </h4>
            <RiTimeLine
              className="size-4 text-amber-700"
              aria-hidden
            />
          </div>
          {plans.length ? (
            <ul className="min-w-0">
              {plans.slice(0, 2).map((plan, index) => (
                <TaskItemRow
                  key={`${plan.content}-${index}`}
                  index={index}
                  content={plan.content}
                  projectName={plan.projectName}
                  category="计划"
                  status={plan.status}
                  isPlan
                />
              ))}
            </ul>
          ) : (
            <p className="py-3 text-xs font-normal leading-4 text-slate-500">
              暂无计划
            </p>
          )}
        </section>
      </div>
      <div className="mt-5 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between text-xs font-medium leading-4">
          <span className="text-slate-500">计划达成率</span>
          <span className="tabular-nums text-slate-900">{fulfillment}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cx(
              "h-full rounded-full",
              hasRisk ? "bg-rose-700" : "bg-emerald-600",
            )}
            style={{ width: `${fulfillment}%` }}
          />
        </div>
        <ButtonLink
          href={`/reports?member=${encodeURIComponent(member.id)}`}
          variant="ghost"
          size="small"
          className="mt-3 self-start"
        >
          查看成员详情 <RiArrowRightSLine className="size-4" aria-hidden />
        </ButtonLink>
      </div>
    </article>
  );
}

