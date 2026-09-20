import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { workCalendarDay } from "@/lib/db/schema";
import { dateInput, shanghaiDate } from "@/lib/daily-input";
import { isWorkday } from "@/lib/domain";
import { WorkspaceShell } from "@/components/workspace/shell";
import { CalendarForm } from "@/components/workspace/calendar-form";
import { Input } from "@/components/premium/forms";
import { Button, ButtonLink } from "@/components/motion/button/base";

export const metadata = { title: "工作日历" };
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; page?: string }>;
}) {
  const actor = await requireUser();
  if (actor.role !== "ADMIN") notFound();
  const params = await searchParams;
  const date = dateInput.catch(shanghaiDate()).parse(params.date);
  const requestedPage = Number(params.page ?? 1);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, 100000)
      : 1;
  const [current] = await getDb()
    .select()
    .from(workCalendarDay)
    .where(
      and(
        eq(workCalendarDay.organizationId, actor.organizationId),
        eq(workCalendarDay.date, date),
      ),
    )
    .orderBy(desc(workCalendarDay.version))
    .limit(1);
  const history = await getDb()
    .select()
    .from(workCalendarDay)
    .where(
      and(
        eq(workCalendarDay.organizationId, actor.organizationId),
        eq(workCalendarDay.date, date),
      ),
    )
    .orderBy(desc(workCalendarDay.version))
    .limit(21)
    .offset((page - 1) * 20);
  return (
    <WorkspaceShell actor={actor} selected="calendar">
      <h1 className="text-2xl font-medium leading-8">工作日历</h1>
      <form action="/admin/calendar" className="flex flex-wrap items-end gap-3">
        <Input name="date" type="date" label="选择日期" defaultValue={date} />
        <Button type="submit">查看</Button>
      </form>
      <CalendarForm
        key={date}
        date={date}
        version={current?.version ?? 0}
        initialWorkday={current?.isWorkday ?? isWorkday(date)}
        initialDescription={current?.description ?? ""}
      />
      <p className="text-sm font-normal leading-5 text-slate-500">
        {current
          ? `该日期已有 ${current.version} 次设置记录。`
          : "该日期尚未调整，当前按周一至周五为工作日。"}
      </p>
      <section aria-label="日期调整记录" className="flex flex-col gap-3">
        <h2 className="text-xl font-medium leading-7">调整记录</h2>
        {history.length ? (
          <ol className="divide-y divide-separator-border">
            {history.slice(0, 20).map((item) => (
              <li key={item.id} className="flex flex-col gap-2 py-4">
                <p>
                  版本 {item.version} · {item.isWorkday ? "工作日" : "休息日"}
                </p>
                <p className="break-words">{item.description}</p>
                <time
                  dateTime={item.createdAt.toISOString()}
                  className="text-sm font-normal leading-5 text-slate-500"
                >
                  {new Intl.DateTimeFormat("zh-CN", {
                    timeZone: "Asia/Shanghai",
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(item.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p>暂无调整记录</p>
        )}
        <nav
          aria-label="日历历史分页"
          className="flex flex-wrap items-center gap-3"
        >
          {page > 1 && (
            <ButtonLink
              href={`/admin/calendar?date=${date}&page=${page - 1}`}
              variant="secondary"
            >
              上一页
            </ButtonLink>
          )}
          <span>第 {page} 页</span>
          {history.length > 20 && (
            <ButtonLink
              href={`/admin/calendar?date=${date}&page=${page + 1}`}
              variant="secondary"
            >
              下一页
            </ButtonLink>
          )}
        </nav>
      </section>
    </WorkspaceShell>
  );
}

