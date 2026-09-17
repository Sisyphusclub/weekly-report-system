import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { workCalendarDay } from "@/lib/db/schema";
import { dateInput, shanghaiDate } from "@/lib/daily-input";
import { isWorkday } from "@/lib/domain";
import { WorkspaceShell } from "@/components/workspace/shell";
import { CalendarForm } from "@/components/workspace/calendar-form";
import { Input } from "@/components/base/input/input";
import { Button } from "@/components/base/buttons/button";

export const metadata = { title: "工作日历" };
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const actor = await requireUser();
  if (actor.role !== "ADMIN") notFound();
  const params = await searchParams;
  const date = dateInput.catch(shanghaiDate()).parse(params.date);
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
  return (
    <WorkspaceShell actor={actor} selected="calendar">
      <h1 className="text-title-1-medium">工作日历</h1>
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
      <p className="text-body-regular text-text-secondary">
        {current
          ? `该日期已有 ${current.version} 次设置记录。`
          : "该日期尚未调整，当前按周一至周五为工作日。"}
      </p>
    </WorkspaceShell>
  );
}
