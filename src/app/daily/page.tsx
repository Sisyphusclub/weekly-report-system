import { and, eq, lt, ne, or } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { report, reportTask } from "@/lib/db/schema";
import { workTask } from "@/lib/db/schema";
import { dateInput, shanghaiDate } from "@/lib/daily-input";
import { WorkspaceShell } from "@/components/workspace/shell";
import { DailyForm } from "@/components/workspace/daily-form";
import { Input } from "@/components/base/input/input";
import { Button } from "@/components/base/buttons/button";

export const metadata = { title: "填写日报" };
export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const actor = await requireUser();
  const params = await searchParams;
  const date = dateInput.catch(shanghaiDate()).parse(params.date);
  const [draft] = await getDb()
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
  const tasks = await getDb()
    .select({
      id: workTask.id,
      content: workTask.content,
      kind: workTask.kind,
      status: workTask.status,
    })
    .from(workTask)
    .where(
      and(
        eq(workTask.organizationId, actor.organizationId),
        eq(workTask.primaryAssigneeId, actor.id),
      ),
    );
  const carryover = await getDb()
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
    ? await getDb()
        .select({ taskId: reportTask.taskId })
        .from(reportTask)
        .where(
          and(
            eq(reportTask.organizationId, actor.organizationId),
            eq(reportTask.reportId, draft.id),
          ),
        )
    : [];
  return (
    <WorkspaceShell actor={actor} selected="daily">
      <header>
        <h1 className="text-title-1-medium">填写日报</h1>
      </header>
      <form action="/daily" className="flex items-end gap-3">
        <Input name="date" type="date" label="报告日期" defaultValue={date} />
        <Button type="submit">打开该日报</Button>
      </form>
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
    </WorkspaceShell>
  );
}
