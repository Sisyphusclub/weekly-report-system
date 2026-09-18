import {
  RiArrowRightSLine,
  RiCheckboxCircleLine,
  RiTimeLine,
} from "@remixicon/react";
import { Avatar } from "@/components/base/avatar/avatar";
import { ButtonLink } from "@/components/base/buttons/button";
import { Chip } from "@/components/base/badges/chip";
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
      className={`flex min-w-0 flex-col rounded-2xl border bg-background-primary-default p-5 shadow-xs ${hasRisk ? "border-status-rose-text/40" : "border-border-button-default"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            initials={member.name.slice(0, 1)}
            color={hasRisk ? "pink" : "blue"}
            size="lg"
          />
          <div className="min-w-0">
            <h3 className="truncate text-headline-semibold">{member.name}</h3>
            <p className="mt-0.5 text-caption-1-regular text-text-tertiary">
              今日团队成员
            </p>
          </div>
        </div>
        <Chip
          variant="caption"
          color={
            hasRisk
              ? "rose"
              : member.submitted >= member.due && member.due > 0
                ? "lime"
                : "yellow"
          }
        >
          {hasRisk
            ? "有阻塞"
            : member.submitted >= member.due && member.due > 0
              ? "按时提交"
              : "待跟进"}
        </Chip>
      </div>
      {hasRisk && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-status-rose-background px-3 py-2 text-caption-1-medium text-status-rose-text">
          <RiTimeLine className="mt-0.5 size-4 shrink-0" aria-hidden />
          {member.openBlockers} 项阻塞需要协调
        </div>
      )}
      <div className="mt-5 grid min-w-0 grid-cols-2 gap-4">
        <section className="min-w-0 border-r border-separator-border pr-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-caption-1-semibold text-text-secondary">
              今日实际
            </h4>
            <RiCheckboxCircleLine
              className="size-4 text-state-success-base"
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
            <p className="py-3 text-caption-1-regular text-text-tertiary">
              尚未记录实际工作
            </p>
          )}
        </section>
        <section className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-caption-1-semibold text-text-secondary">
              今日计划
            </h4>
            <RiTimeLine
              className="size-4 text-status-yellow-text"
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
            <p className="py-3 text-caption-1-regular text-text-tertiary">
              暂无计划
            </p>
          )}
        </section>
      </div>
      <div className="mt-5 border-t border-separator-border pt-4">
        <div className="flex items-center justify-between text-caption-1-medium">
          <span className="text-text-secondary">计划达成率</span>
          <span className="tabular-nums text-text-primary">{fulfillment}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background-tertiary-default">
          <div
            className={`h-full rounded-full ${hasRisk ? "bg-status-rose-text" : "bg-state-success-base"}`}
            style={{ width: `${fulfillment}%` }}
          />
        </div>
        <ButtonLink
          href={`/reports?member=${encodeURIComponent(member.id)}`}
          variant="ghost"
          size="small"
          trailingIcon={RiArrowRightSLine}
          className="mt-3 self-start"
        >
          查看成员详情
        </ButtonLink>
      </div>
    </article>
  );
}
