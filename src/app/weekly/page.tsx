import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { report } from "@/lib/db/schema";
import { dateInput, shanghaiDate } from "@/lib/daily-input";
import { weekDates } from "@/lib/domain";
import { WorkspaceShell } from "@/components/workspace/shell";
import { WeeklyForm } from "@/components/workspace/weekly-form";
import { Input } from "@/components/base/input/input";
import { Button } from "@/components/base/buttons/button";
export const metadata = { title: "填写周报" };
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
  const [item] = await getDb()
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
    .limit(1);
  return (
    <WorkspaceShell actor={actor} selected="weekly">
      <header>
        <h1 className="text-title-1-medium">填写周报</h1>
        <p className="mt-2 text-body-regular text-text-secondary">
          选择本周任意日期，系统按周一至周日汇总已提交日报。
        </p>
      </header>
      <form action="/weekly" className="flex items-end gap-3">
        <Input name="date" type="date" label="本周日期" defaultValue={date} />
        <Button type="submit">打开本周</Button>
      </form>
      <WeeklyForm
        key={date}
        date={date}
        version={item?.version ?? 0}
        initialSummary={item?.summary ?? ""}
        submitted={item?.status === "SUBMITTED"}
        reportId={item?.id}
      />
    </WorkspaceShell>
  );
}
