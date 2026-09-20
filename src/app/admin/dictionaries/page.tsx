import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { category, deliverableUnit, dictionaryMerge } from "@/lib/db/schema";
import { WorkspaceShell } from "@/components/workspace/shell";
import { DictionaryForm } from "@/components/workspace/dictionary-form";
import { ButtonLink } from "@/components/motion/button/base";
import { DictionaryMergeForm } from "@/components/workspace/dictionary-merge-form";
import { DictionaryMergeUndo } from "@/components/workspace/dictionary-merge-undo";
export const metadata = { title: "分类与交付物单位" };
export default async function DictionariesPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; page?: string }>;
}) {
  const actor = await requireUser();
  if (actor.role !== "ADMIN") notFound();
  const params = await searchParams;
  const kind = params.kind === "unit" ? "unit" : "category";
  const parsedPage = Number(params.page);
  const page =
    Number.isSafeInteger(parsedPage) && parsedPage > 0
      ? Math.min(parsedPage, 100000)
      : 1;
  const table = kind === "unit" ? deliverableUnit : category;
  const rows = await getDb()
    .select()
    .from(table)
    .where(eq(table.organizationId, actor.organizationId))
    .orderBy(asc(table.sortOrder), asc(table.id))
    .limit(21)
    .offset((page - 1) * 20);
  const merges = await getDb()
    .select()
    .from(dictionaryMerge)
    .where(eq(dictionaryMerge.organizationId, actor.organizationId));
  return (
    <WorkspaceShell actor={actor} selected="dictionaries">
      <h1 className="text-title-1-medium">分类与交付物单位</h1>
      <p className="text-body-regular text-text-secondary">
        停用后不能用于新任务，历史记录中的名称快照保留。
      </p>
      <nav aria-label="资料类型" className="flex gap-3">
        <ButtonLink
          href="?kind=category"
          variant={kind === "category" ? "primary" : "secondary"}
        >
          工作分类
        </ButtonLink>
        <ButtonLink
          href="?kind=unit"
          variant={kind === "unit" ? "primary" : "secondary"}
        >
          交付物单位
        </ButtonLink>
      </nav>
      <DictionaryForm key={kind} kind={kind} />
      <DictionaryMergeForm
        kind={kind}
        entries={rows.map((row) => ({ id: row.id, name: row.name }))}
      />
      {merges
        .filter(
          (merge) =>
            merge.kind === kind &&
            !merge.undoneAt &&
            merge.expiresAt >= new Date(),
        )
        .map((merge) => (
          <DictionaryMergeUndo
            key={merge.id}
            id={merge.id}
            undoUntil={merge.expiresAt.toISOString()}
          />
        ))}
      <section aria-label="已有资料" className="grid gap-4 md:grid-cols-2">
        {rows.slice(0, 20).map((row) => (
          <DictionaryForm
            key={`${row.id}:${row.updatedAt.toISOString()}`}
            kind={kind}
            entry={{ ...row, updatedAt: row.updatedAt.toISOString() }}
          />
        ))}
      </section>
      {rows.length === 0 && <p>该页暂无资料。</p>}
      <footer className="flex gap-3">
        {page > 1 && (
          <ButtonLink
            href={`?kind=${kind}&page=${page - 1}`}
            variant="secondary"
          >
            上一页
          </ButtonLink>
        )}
        <span>第 {page} 页</span>
        {rows.length > 20 && (
          <ButtonLink
            href={`?kind=${kind}&page=${page + 1}`}
            variant="secondary"
          >
            下一页
          </ButtonLink>
        )}
      </footer>
    </WorkspaceShell>
  );
}

