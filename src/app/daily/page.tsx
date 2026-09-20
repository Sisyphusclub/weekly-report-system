import {
  RiAlarmWarningLine,
  RiArrowRightLine,
  RiCheckboxCircleLine,
  RiTimeLine,
} from "@remixicon/react";
import { and, eq, lt, or } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { report, reportTask, workTask } from "@/lib/db/schema";
import { dateInput, shanghaiDate } from "@/lib/daily-input";
import { WorkspaceShell } from "@/components/workspace/shell";
import { DailyForm } from "@/components/workspace/daily-form";
import { Input } from "@/components/premium/forms";
import { Button, ButtonLink } from "@/components/motion/button/base";
import { Badge } from "@/components/premium/badge";
import { BlockerForm } from "@/components/workspace/blocker-form";

export const metadata = { title: "今日工作台" };

export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const actor = await requireUser();
  const params = await searchParams;
  const date = dateInput.catch(shanghaiDate()).parse(params.date);
  const db = getDb();
  const [draft] = await db
    .select({
      id: report.id,
      summary: report.summary,
      noWorkReason: report.noWorkReason,
      noPlanReason: report.noPlanReason,
      version: report.version,
      status: report.status,
    })
    .from(report)
    .where(
      and(
        eq(report.organizationId, actor.organizationId),
        eq(report.authorId, actor.id),
        eq(report.type, "DAILY"),
        eq(report.reportDate, date),
      ),
    )
    .limit(1);
  const tasks = await db
    .select({
      id: workTask.id,
      content: workTask.content,
      kind: workTask.kind,
      status: workTask.status,
      dueDate: workTask.dueDate,
    })
    .from(workTask)
    .where(
      and(
        eq(workTask.organizationId, actor.organizationId),
        eq(workTask.primaryAssigneeId, actor.id),
      ),
    );
  const carryover = await db
    .select({ id: workTask.id })
    .from(workTask)
    .where(
      and(
        eq(workTask.organizationId, actor.organizationId),
        eq(workTask.primaryAssigneeId, actor.id),
        eq(workTask.kind, "PLAN"),
        lt(workTask.dueDate, date),
        or(
          eq(workTask.status, "TODO"),
          eq(workTask.status, "IN_PROGRESS"),
          eq(workTask.status, "BLOCKED"),
        ),
      ),
    );
  const associations = draft
    ? await db
        .select({ taskId: reportTask.taskId })
        .from(reportTask)
        .where(
          and(
            eq(reportTask.organizationId, actor.organizationId),
            eq(reportTask.reportId, draft.id),
          ),
        )
    : [];
  const plans = tasks.filter(
    (task) => task.kind === "PLAN" && (!task.dueDate || task.dueDate === date),
  );
  const completed = tasks.filter(
    (task) => task.kind === "ACTUAL" && task.status === "DONE",
  ).length;
  const blocked = tasks.filter((task) => task.status === "BLOCKED").length;
  return (
    <WorkspaceShell actor={actor} selected="daily">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-caption-1-semibold uppercase tracking-[0.08em] text-accent-600">
            今日 · {date.replaceAll("-", ".")}
          </p>
          <h1 className="mt-2 text-title-1-semibold">今日工作台</h1>
          <p className="mt-2 text-body-regular text-text-secondary">
            早晨定计划，下班核销实际，卡点及时暴露。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="caption" color="lime">
            <RiCheckboxCircleLine className="mr-1 size-3.5" aria-hidden />
            工作日
          </Badge>
          <span className="hidden text-caption-1-regular text-text-tertiary sm:inline">
            截止 18:30 · 草稿自动同步
          </span>
        </div>
      </header>
      <form
        action="/daily"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border-button-default bg-background-primary-default p-4 shadow-xs"
      >
        <Input name="date" type="date" label="报告日期" defaultValue={date} />
        <Button type="submit" variant="secondary">
          打开该日报
        </Button>
        <span className="ml-auto hidden items-center gap-2 text-caption-1-regular text-text-tertiary md:flex">
          <RiTimeLine className="size-4" aria-hidden />
          距提交截止还有今日工作时间
        </span>
      </form>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.45fr)]">
        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-title-2-semibold">今日计划与实际</h2>
              <p className="mt-1 text-caption-1-regular text-text-tertiary">
                已带入 {plans.length} 项计划 · 已完成 {completed} 项
              </p>
            </div>
            <ButtonLink
              href="/tasks"
              variant="ghost"
              size="small"
              trailingIcon={RiArrowRightLine}
            >
              管理任务
            </ButtonLink>
          </div>
          <DailyForm
            key={date}
            date={date}
            draft={draft ?? null}
            tasks={tasks}
            initialTaskIds={Array.from(
              new Set([
                ...carryover.map((item) => item.id),
                ...associations.map((item) => item.taskId),
              ]),
            )}
          />
        </section>
        <aside className="flex min-w-0 flex-col gap-4">
          <section className="rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-title-3-semibold">今日履约率</h2>
                <p className="mt-1 text-caption-1-regular text-text-tertiary">
                  计划完成情况实时更新
                </p>
              </div>
              <span className="text-title-2-semibold text-accent-600">
                {plans.length
                  ? Math.round((completed / plans.length) * 100)
                  : 0}
                %
              </span>
            </div>
            <div
              className="mx-auto mt-5 flex size-36 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(var(--color-accent-500) ${plans.length ? Math.round((completed / plans.length) * 100) : 0}%, var(--color-background-tertiary-default) 0)`,
              }}
            >
              <div className="flex size-28 flex-col items-center justify-center rounded-full bg-background-primary-default">
                <span className="text-title-2-semibold tabular-nums">
                  {completed}/{plans.length}
                </span>
                <span className="text-caption-1-regular text-text-tertiary">
                  项已完成
                </span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-title-3-semibold">{plans.length}</p>
                <p className="text-caption-2-regular text-text-tertiary">
                  今日计划
                </p>
              </div>
              <div>
                <p className="text-title-3-semibold text-state-success-base">
                  {completed}
                </p>
                <p className="text-caption-2-regular text-text-tertiary">
                  已完成
                </p>
              </div>
              <div>
                <p className="text-title-3-semibold text-status-rose-text">
                  {blocked}
                </p>
                <p className="text-caption-2-regular text-text-tertiary">
                  阻塞
                </p>
              </div>
            </div>
          </section>
          <section className="rounded-2xl border border-status-rose-text/30 bg-background-primary-default p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-status-rose-background text-status-rose-text">
                <RiAlarmWarningLine className="size-4" aria-hidden />
              </span>
              <div>
                <h2 className="text-title-3-semibold">阻塞协调</h2>
                <p className="mt-1 text-caption-1-regular text-text-tertiary">
                  遇到需要他人介入的事项，及时提交。
                </p>
              </div>
            </div>
            <div className="mt-4">
              <BlockerForm compact />
            </div>
          </section>
        </aside>
      </div>
    </WorkspaceShell>
  );
}

