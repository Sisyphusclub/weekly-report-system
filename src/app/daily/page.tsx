import { and, asc, eq, ne } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { project, report } from "@/lib/db/schema";
import { dateInput, shanghaiDate } from "@/lib/daily-input";
import { WorkspaceShell } from "@/components/workspace/shell";
import { DailyForm } from "@/components/workspace/daily-form";

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
      planEntries: report.planEntries,
      workEntries: report.workEntries,
      blockers: report.blockers,
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
  const projects = await db
    .select({ id: project.id, name: project.name })
    .from(project)
    .where(
      and(
        eq(project.organizationId, actor.organizationId),
        ne(project.status, "ARCHIVED"),
      ),
    )
    .orderBy(asc(project.name));
  return (
    <WorkspaceShell actor={actor} selected="daily">
      <DailyForm
        key={date}
        date={date}
        reporterName={actor.name}
        draft={draft ?? null}
        projects={projects}
      />
    </WorkspaceShell>
  );
}
