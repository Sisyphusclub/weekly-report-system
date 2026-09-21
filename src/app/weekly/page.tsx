import {
  RiArrowRightLine,
  RiCheckboxCircleLine,
  RiFileCopy2Line,
  RiFlagLine,
  RiSparklingLine,
} from "@remixicon/react";
import { and, eq, gte, lte, ne } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { blocker, report } from "@/lib/db/schema";
import { blockerVisibility } from "@/lib/blockers";
import { dateInput, shanghaiDate } from "@/lib/daily-input";
import { weekDates } from "@/lib/domain";
import { WorkspaceShell } from "@/components/workspace/shell";
import { WeeklyForm } from "@/components/workspace/weekly-form";
import { DatePicker } from "@/components/premium/forms";
import { Button } from "@/components/motion/button/base";
import { Badge } from "@/components/premium/badge";

export const metadata = { title: "本周周报" };

export default async function WeeklyPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const actor = await requireUser();
  if (actor.role === "ADMIN") return null;
  const params = await searchParams;
  const date = dateInput.catch(shanghaiDate()).parse(params.date);
  const weekStart = weekDates(date)[0];
  const db = getDb();
  const [items, dailyRows, openBlockers] = await Promise.all([
    db
      .select({
        id: report.id,
        summary: report.summary,
        version: report.version,
        status: report.status,
      })
      .from(report)
      .where(
        and(
          eq(report.organizationId, actor.organizationId),
          eq(report.authorId, actor.id),
          eq(report.type, "WEEKLY"),
          eq(report.weekStart, weekStart),
        ),
      )
      .limit(1),
    db
      .select({ reportDate: report.reportDate, status: report.status })
      .from(report)
      .where(
        and(
          eq(report.organizationId, actor.organizationId),
          eq(report.authorId, actor.id),
          eq(report.type, "DAILY"),
          gte(report.reportDate, weekStart),
          lte(report.reportDate, weekDates(date)[4]),
        ),
      ),
    db
      .select({ id: blocker.id })
      .from(blocker)
      .where(
        and(
          blockerVisibility(actor),
          ne(blocker.status, "RESOLVED"),
          gte(blocker.createdAt, new Date(`${weekStart}T00:00:00+08:00`)),
        ),
      ),
  ]);
  const item = items[0];
  const submittedDates = new Set(
    dailyRows
      .filter((row) => row.status === "SUBMITTED" && row.reportDate)
      .map((row) => row.reportDate as string),
  );
  const missingDays = daysMissing(weekDates(date).slice(0, 5), submittedDates);
  const days = weekDates(date).slice(0, 5);
  return (
    <WorkspaceShell actor={actor} selected="weekly">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold leading-4 uppercase tracking-[0.08em] text-primary">
            周报周期 · {weekStart.replaceAll("-", ".")}
          </p>
          <h1 className="mt-2 text-2xl font-semibold leading-8">本周周报</h1>
          <p className="mt-2 text-sm font-normal leading-5 text-muted-foreground">
            汇总本周日报，复盘阻塞，并明确下周重点里程碑。
          </p>
        </div>
        <Badge
          variant="caption"
          color={item?.status === "SUBMITTED" ? "success" : "warning"}
        >
          {item?.status === "SUBMITTED" ? "已提交快照" : "草稿待提交"}
        </Badge>
      </header>
      <form
        action="/weekly"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-xs"
      >
        <DatePicker name="date" label="本周日期" defaultValue={date} />
        <Button type="submit" variant="secondary">
          打开本周
        </Button>
      </form>
      <section
        className={`rounded-xl border p-4 ${missingDays.length ? "border-warning-border bg-warning-subtle" : "border-success-border bg-success-subtle"}`}
      >
        <div className="flex items-start gap-3">
          <RiFlagLine
            className={`mt-0.5 size-5 shrink-0 ${missingDays.length ? "text-warning" : "text-success"}`}
            aria-hidden
          />
          <div>
            <p
              className={`text-sm font-semibold leading-5 ${missingDays.length ? "text-warning" : "text-success"}`}
            >
              {missingDays.length
                ? `还有 ${missingDays.length} 个工作日未提交日报`
                : "本周日报已全部提交"}
            </p>
            <p
              className={`mt-1 text-xs font-normal leading-4 ${missingDays.length ? "text-warning" : "text-success"}`}
            >
              {missingDays.length
                ? `缺少：${missingDays.join("、")}。提交周报前请先补齐。`
                : "系统可以从周一至周五日报生成周报快照。"}
            </p>
          </div>
        </div>
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-xs">
          <SectionHeading
            icon={RiFileCopy2Line}
            title="本周实际工作聚合"
            detail="从周一至周五日报提炼项目成果"
            action={
              <Button variant="secondary">
                <RiSparklingLine className="size-4" aria-hidden />
                从日报一键汇总
              </Button>
            }
          />
          <div className="mt-5 divide-y divide-separator-border">
            {days.map((day, index) => (
              <div key={day} className="flex gap-4 py-4">
                <div className="w-16 shrink-0">
                  <p className="text-xs font-semibold leading-4 text-foreground">
                    周{["一", "二", "三", "四", "五"][index]}
                  </p>
                  <p className="mt-1 text-[11px] font-normal leading-4 text-muted-foreground">
                    {day.slice(5).replace("-", ".")}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-normal leading-5 text-muted-foreground">
                    {index < 3
                      ? "日报已提交，工作内容将在生成快照后展示。"
                      : "等待日报提交后自动汇总。"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge
                      variant="caption"
                      color={index < 3 ? "success" : "warning"}
                    >
                      {index < 3 ? "已提交" : "待提交"}
                    </Badge>
                    {index < 3 && (
                      <Badge variant="caption" color="info">
                        项目成果待润色
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <aside className="flex flex-col gap-4">
          <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <SectionHeading
              icon={RiCheckboxCircleLine}
              title="未闭环阻塞复盘"
              detail={
                openBlockers.length
                  ? `${openBlockers.length} 项待确认`
                  : "确认问题是否带入下周"
              }
            />
            <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm font-medium leading-5">暂无本周阻塞记录</p>
              <p className="mt-1 text-xs font-normal leading-4 text-muted-foreground">
                日报中的阻塞会自动出现在这里。
              </p>
            </div>
          </section>
          <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <SectionHeading
              icon={RiArrowRightLine}
              title="下周重点规划"
              detail="先写清工作计划与预期产出"
            />
            <div className="mt-4 grid gap-2 text-xs font-medium leading-4 text-muted-foreground sm:grid-cols-[1fr_1.5fr_1fr_100px]">
              <span>归属项目</span>
              <span>里程碑计划</span>
              <span>预期产出物</span>
              <span>截止日</span>
            </div>
            <div className="mt-3 rounded-lg bg-muted px-3 py-3 text-xs font-normal leading-4 text-muted-foreground">
              提交周报后可继续补充下周计划。
            </div>
          </section>
        </aside>
      </div>
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <SectionHeading
          icon={RiSparklingLine}
          title="周报总结"
          detail="支持保存草稿，提交后生成不可修改快照"
        />
        <div className="mt-5 max-w-3xl">
          <WeeklyForm
            key={date}
            date={date}
            version={item?.version ?? 0}
            initialSummary={item?.summary ?? ""}
            submitted={item?.status === "SUBMITTED"}
            reportId={item?.id}
          />
        </div>
      </section>
    </WorkspaceShell>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  detail,
  action,
}: {
  icon: typeof RiFlagLine;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold leading-6">{title}</h2>
          <p className="mt-1 text-xs font-normal leading-4 text-muted-foreground">
            {detail}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}
function daysMissing(days: string[], submitted: Set<string>) {
  return days
    .filter((day) => !submitted.has(day))
    .map((day) => `周${["一", "二", "三", "四", "五"][days.indexOf(day)]}`);
}
