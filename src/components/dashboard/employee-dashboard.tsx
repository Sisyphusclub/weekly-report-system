import {
  RiAlarmWarningLine,
  RiArrowRightLine,
  RiCalendarCheckLine,
  RiCheckboxCircleLine,
  RiFileList3Line,
  RiFocus3Line,
  RiTimeLine,
} from "@remixicon/react";
import { ButtonLink } from "@/components/base/buttons/button";
import { Chip } from "@/components/base/badges/chip";
import { TaskItemRow, type WorkStatus } from "./task-item-row";

type EmployeeTask = {
  id: string;
  content: string;
  kind: "ACTUAL" | "PLAN";
  status: WorkStatus;
  projectName: string;
  categoryName: string;
  dueDate: string | null;
};

type RecentReport = {
  id: string;
  type: "DAILY" | "WEEKLY";
  date: string | null;
  weekStart: string | null;
  summary: string | null;
  status: "DRAFT" | "SUBMITTED";
};

export function EmployeeDashboard({
  name,
  today,
  tasks,
  submitted,
  openBlockers,
  recentReports,
}: {
  name: string;
  today: string;
  tasks: EmployeeTask[];
  submitted: boolean;
  openBlockers: number;
  recentReports: RecentReport[];
}) {
  const plans = tasks.filter((task) => task.kind === "PLAN");
  const actuals = tasks.filter((task) => task.kind === "ACTUAL");
  const completed = actuals.filter((task) => task.status === "DONE").length;
  const planDone = plans.filter((task) => task.status === "DONE").length;
  const fulfillment = plans.length
    ? Math.round((planDone / plans.length) * 100)
    : 0;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-caption-1-semibold uppercase tracking-[0.08em] text-accent-600">
            {today} · 我的工作
          </p>
          <h1 className="mt-2 text-title-1-semibold tracking-[-0.02em]">
            你好，{name}
          </h1>
          <p className="mt-2 max-w-xl text-body-regular text-text-secondary">
            先看今天的计划，再补齐实际完成和需要协调的事项。
          </p>
        </div>
        <ButtonLink
          href="/daily"
          variant="primary"
          leadingIcon={submitted ? RiFileList3Line : RiCheckboxCircleLine}
        >
          {submitted ? "查看今日日报" : "填写今日日报"}
        </ButtonLink>
      </header>

      <section className="grid gap-px overflow-hidden rounded-2xl border border-border-button-default bg-border-button-default shadow-xs sm:grid-cols-3">
        <div className="bg-background-primary-default p-4 sm:p-5">
          <div className="flex items-center gap-2 text-caption-1-medium text-text-secondary">
            <RiCalendarCheckLine
              className="size-4 text-accent-600"
              aria-hidden
            />
            今日状态
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-title-2-semibold tabular-nums">
              {plans.length}
            </span>
            <span className="text-caption-1-regular text-text-tertiary">
              项计划
            </span>
          </div>
        </div>
        <div className="bg-background-primary-default p-4 sm:p-5">
          <div className="flex items-center gap-2 text-caption-1-medium text-text-secondary">
            <RiCheckboxCircleLine
              className="size-4 text-state-success-base"
              aria-hidden
            />
            已完成
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-title-2-semibold tabular-nums text-state-success-base">
              {completed}
            </span>
            <span className="text-caption-1-regular text-text-tertiary">
              项实际
            </span>
          </div>
        </div>
        <div className="bg-background-primary-default p-4 sm:p-5">
          <div className="flex items-center gap-2 text-caption-1-medium text-text-secondary">
            <RiAlarmWarningLine
              className={`size-4 ${openBlockers ? "text-status-rose-text" : "text-text-tertiary"}`}
              aria-hidden
            />
            待协调
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-title-2-semibold tabular-nums ${openBlockers ? "text-status-rose-text" : "text-text-primary"}`}
            >
              {openBlockers}
            </span>
            <span className="text-caption-1-regular text-text-tertiary">
              项阻塞
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 gap-6 md:grid-cols-2">
          <TaskSection
            title="今日工作计划"
            detail={plans.length ? `${plans.length} 项计划` : "今天还没有计划"}
            icon={RiFocus3Line}
            tasks={plans}
            emptyHref="/tasks"
            emptyText="去任务管理添加今天的计划"
          />
          <TaskSection
            title="今日实际完成"
            detail={
              actuals.length
                ? `${completed}/${actuals.length} 项已完成`
                : "下班前记得补充实际工作"
            }
            icon={RiCheckboxCircleLine}
            tasks={actuals}
            emptyHref="/daily"
            emptyText="打开日报记录实际工作"
          />
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <section className="rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-title-3-semibold">今日履约率</h2>
                <p className="mt-1 text-caption-1-regular text-text-tertiary">
                  计划完成情况
                </p>
              </div>
              <span className="text-title-2-semibold tabular-nums text-accent-600">
                {fulfillment}%
              </span>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-background-tertiary-default">
              <div
                className="h-full rounded-full bg-accent-500 transition-[width] duration-500"
                style={{ width: `${fulfillment}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-caption-1-regular text-text-tertiary">
              <span>{planDone} 项已核销</span>
              <span>{plans.length - planDone} 项待跟进</span>
            </div>
          </section>

          <section
            className={`rounded-2xl border p-5 shadow-xs ${openBlockers ? "border-status-rose-text/30 bg-status-rose-background" : "border-border-button-default bg-background-primary-default"}`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${openBlockers ? "bg-background-primary-default text-status-rose-text" : "bg-background-secondary-default text-text-tertiary"}`}
              >
                <RiAlarmWarningLine className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-title-3-semibold">需要协调</h2>
                <p
                  className={`mt-1 text-caption-1-regular ${openBlockers ? "text-status-rose-text" : "text-text-tertiary"}`}
                >
                  {openBlockers
                    ? `${openBlockers} 项阻塞等待处理`
                    : "当前没有待协调事项"}
                </p>
              </div>
            </div>
            <ButtonLink
              href="/blockers"
              variant={openBlockers ? "secondary" : "ghost"}
              size="small"
              trailingIcon={RiArrowRightLine}
              className="mt-4"
            >
              {openBlockers ? "查看阻塞" : "提交阻塞"}
            </ButtonLink>
          </section>
        </aside>
      </div>

      <section className="rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-title-3-semibold">最近报告</h2>
            <p className="mt-1 text-caption-1-regular text-text-tertiary">
              你的日报和周报记录
            </p>
          </div>
          <ButtonLink
            href="/reports"
            variant="ghost"
            size="small"
            trailingIcon={RiArrowRightLine}
          >
            查看全部
          </ButtonLink>
        </div>
        {recentReports.length ? (
          <ul className="mt-3 divide-y divide-separator-border">
            {recentReports.slice(0, 4).map((report) => (
              <li
                key={report.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background-secondary-default text-text-tertiary">
                    <RiFileList3Line className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-body-medium">
                      {report.type === "DAILY" ? "日报" : "周报"} ·{" "}
                      {report.date ?? report.weekStart}
                    </p>
                    <p className="mt-1 truncate text-caption-1-regular text-text-tertiary">
                      {report.summary || "未填写总结"}
                    </p>
                  </div>
                </div>
                <Chip
                  variant="caption"
                  color={report.status === "SUBMITTED" ? "lime" : "yellow"}
                >
                  {report.status === "SUBMITTED" ? "已提交" : "草稿"}
                </Chip>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 py-5 text-center text-body-regular text-text-tertiary">
            还没有报告记录
          </p>
        )}
      </section>
    </>
  );
}

function TaskSection({
  title,
  detail,
  icon: Icon,
  tasks,
  emptyHref,
  emptyText,
}: {
  title: string;
  detail: string;
  icon: typeof RiTimeLine;
  tasks: EmployeeTask[];
  emptyHref: string;
  emptyText: string;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background-secondary-default text-accent-600">
            <Icon className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-title-3-semibold">{title}</h2>
            <p className="mt-1 text-caption-1-regular text-text-tertiary">
              {detail}
            </p>
          </div>
        </div>
        <RiTimeLine
          className="mt-1 size-4 shrink-0 text-text-tertiary"
          aria-hidden
        />
      </div>
      {tasks.length ? (
        <ul className="mt-4 divide-y divide-separator-border">
          {tasks.slice(0, 6).map((task, index) => (
            <TaskItemRow
              key={task.id}
              index={index}
              content={task.content}
              projectName={task.projectName}
              category={task.categoryName}
              status={task.status}
              isPlan={task.kind === "PLAN"}
            />
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-border-button-default px-4 py-7 text-center">
          <p className="text-body-regular text-text-secondary">{emptyText}</p>
          <ButtonLink
            href={emptyHref}
            variant="ghost"
            size="small"
            className="mt-2"
            trailingIcon={RiArrowRightLine}
          >
            去处理
          </ButtonLink>
        </div>
      )}
    </section>
  );
}
