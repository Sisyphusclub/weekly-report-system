"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Input, Textarea } from "@/components/premium/forms";
import { Button, ButtonLink } from "@/components/motion/button/base";
import { Badge } from "@/components/premium/badge";
import { DailyDraftController } from "@/lib/daily-draft-controller";
import {
  dailyBlockersSchema,
  dailyEntriesSchema,
  type DailyBlocker,
  type DailyEntry,
} from "@/lib/daily-input";
import { remoteDailyDraft, type RemoteDailyDraft } from "@/lib/daily-conflict";

type Project = { id: string; name: string };
const statusOptions = [
  ["TODO", "未开始"],
  ["IN_PROGRESS", "进行中"],
  ["DONE", "已完成"],
  ["BLOCKED", "阻塞"],
  ["CANCELED", "已取消"],
] as const;
const categoryOptions = [
  "计划",
  "需求",
  "测试",
  "部署运维",
  "数据算法",
  "开发",
  "设计",
  "会议协作",
  "综合事务",
  "其他",
];
const severityOptions = [
  ["NORMAL", "一般"],
  ["IMPORTANT", "重要"],
  ["URGENT", "紧急"],
] as const;
const statusLabel = Object.fromEntries(statusOptions) as Record<string, string>;

function blankEntry(kind: "plan" | "work"): DailyEntry {
  return {
    content: "",
    status: kind === "plan" ? "TODO" : "DONE",
    category: "综合事务",
    deliverables: [],
    projectId: null,
  };
}
function blankBlocker(projects: Project[]): DailyBlocker {
  return { description: "", projectId: projects[0]?.id ?? "", severity: "NORMAL" };
}

function EntryEditor({
  entry,
  index,
  kind,
  disabled,
  onChange,
  onRemove,
}: {
  entry: DailyEntry;
  index: number;
  kind: "plan" | "work";
  disabled: boolean;
  onChange: (entry: DailyEntry) => void;
  onRemove: () => void;
}) {
  const set = (patch: Partial<DailyEntry>) => onChange({ ...entry, ...patch });
  return (
    <li className="rounded-xl border border-border-button-default bg-background-primary-default p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-caption-1-semibold tabular-nums text-accent-600">
          {String(index + 1).padStart(2, "0")}
        </span>
        <Button type="button" variant="ghost" size="small" disabled={disabled} onClick={onRemove}>
          删除
        </Button>
      </div>
      <Textarea
        label={kind === "plan" ? "计划内容" : "工作内容"}
        value={entry.content}
        onChange={(content) => set({ content })}
        isDisabled={disabled}
        isRequired
        maxLength={5000}
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-caption-1-medium text-text-secondary">
          类型
          <select
            value={entry.category}
            disabled={disabled}
            onChange={(event) => set({ category: event.target.value })}
            className="min-h-10 rounded-lg border border-border-button-default bg-background-primary-default px-3 text-body-regular text-text-primary outline-none focus:border-accent-600"
          >
            {categoryOptions.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-caption-1-medium text-text-secondary">
          进度
          <select
            value={entry.status}
            disabled={disabled}
            onChange={(event) => set({ status: event.target.value as DailyEntry["status"] })}
            className="min-h-10 rounded-lg border border-border-button-default bg-background-primary-default px-3 text-body-regular text-text-primary outline-none focus:border-accent-600"
          >
            {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      {kind === "work" && (
        <div className="mt-3">
          <p className="mb-2 text-caption-1-medium text-text-secondary">产出物</p>
          <div className="flex flex-col gap-2">
            {entry.deliverables.map((deliverable, deliverableIndex) => (
              <div key={`${index}-${deliverableIndex}`} className="flex gap-2">
                <Input
                  aria-label={`第 ${index + 1} 项产出物 ${deliverableIndex + 1}`}
                  value={deliverable}
                  onChange={(value) => set({ deliverables: entry.deliverables.map((item, itemIndex) => itemIndex === deliverableIndex ? value : item) })}
                  placeholder="例如：教材1本、章节13章"
                  isDisabled={disabled}
                  maxLength={200}
                />
                <Button type="button" variant="ghost" size="small" disabled={disabled} onClick={() => set({ deliverables: entry.deliverables.filter((_, itemIndex) => itemIndex !== deliverableIndex) })}>
                  移除
                </Button>
              </div>
            ))}
            <Button type="button" variant="secondary" size="small" disabled={disabled || entry.deliverables.length >= 20} onClick={() => set({ deliverables: [...entry.deliverables, ""] })}>
              添加产出物
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

function EntryList({
  entries,
  kind,
  disabled,
  onChange,
  onAdd,
}: {
  entries: DailyEntry[];
  kind: "plan" | "work";
  disabled: boolean;
  onChange: (entries: DailyEntry[]) => void;
  onAdd: () => void;
}) {
  return (
    <div>
      {entries.length ? (
        <ol className="flex flex-col gap-3">
          {entries.map((entry, index) => (
            <EntryEditor
              key={index}
              entry={entry}
              index={index}
              kind={kind}
              disabled={disabled}
              onChange={(next) => onChange(entries.map((item, itemIndex) => itemIndex === index ? next : item))}
              onRemove={() => onChange(entries.filter((_, itemIndex) => itemIndex !== index))}
            />
          ))}
        </ol>
      ) : (
        <p className="rounded-xl border border-dashed border-border-button-default p-5 text-body-regular text-text-secondary">
          暂无条目，请添加一项。
        </p>
      )}
      <Button type="button" variant="secondary" className="mt-3" disabled={disabled || entries.length >= 100} onClick={onAdd}>
        添加{kind === "plan" ? "工作计划" : "工作内容"}
      </Button>
    </div>
  );
}

export function DailyForm({
  date,
  reporterName,
  draft,
  projects,
}: {
  date: string;
  reporterName: string;
  projects: Project[];
  draft: {
    id: string;
    summary: string | null;
    noWorkReason: string | null;
    noPlanReason: string | null;
    planEntries: unknown;
    workEntries: unknown;
    blockers: unknown;
    version: number;
    status: string;
  } | null;
}) {
  const initialPlans = dailyEntriesSchema.safeParse(draft?.planEntries).success ? dailyEntriesSchema.parse(draft?.planEntries) : [];
  const initialWorks = dailyEntriesSchema.safeParse(draft?.workEntries).success ? dailyEntriesSchema.parse(draft?.workEntries) : [];
  const initialBlockers = dailyBlockersSchema.safeParse(draft?.blockers).success ? dailyBlockersSchema.parse(draft?.blockers) : [];
  const [remote, setRemote] = useState<RemoteDailyDraft | null>(null);
  const [controller] = useState(() => new DailyDraftController(
    {
      content: {
        summary: draft?.summary ?? "",
        noWorkReason: draft?.noWorkReason ?? "",
        noPlanReason: draft?.noPlanReason ?? "",
        taskIds: [],
        plans: initialPlans,
        works: initialWorks,
        blockers: initialBlockers,
      },
      version: draft?.version ?? 0,
      id: draft?.id,
      submitted: draft?.status === "SUBMITTED",
    },
    async (content, version, submit) => {
      let response: Response;
      try {
        response = await fetch("/api/reports/daily", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...content, plans: content.plans ?? [], works: content.works ?? [], blockers: content.blockers ?? [], reportDate: date, version, submit }),
        });
      } catch {
        throw new Error("网络异常，内容仍保留在本地，请稍后重试。");
      }
      const result = await response.json();
      if (response.status === 409) {
        const conflict = remoteDailyDraft.safeParse(result.remote);
        if (conflict.success) setRemote(conflict.data);
      }
      if (!response.ok) throw new Error(result.error ?? "保存失败，请稍后重试");
      return result;
    },
  ));
  const state = useSyncExternalStore(controller.subscribe, controller.snapshot, controller.snapshot);
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (!state.dirty && !state.pending) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [state.dirty, state.pending]);
  const disabled = state.submitted || submitting;
  const plans = state.content.plans ?? [];
  const works = state.content.works ?? [];
  const blockers = state.content.blockers ?? [];
  const updatePlans = (next: DailyEntry[]) => controller.update({ plans: next });
  const updateWorks = (next: DailyEntry[]) => controller.update({ works: next });
  const updateBlockers = (next: DailyBlocker[]) => controller.update({ blockers: next });
  const saveSubmit = async () => { setSubmitting(true); try { await controller.save(true); } finally { setSubmitting(false); } };

  return (
    <form onSubmit={(event) => { event.preventDefault(); void controller.save(false); }} className="flex max-w-3xl flex-col gap-5">
      <section className="rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-caption-1-regular text-text-secondary">汇报人：{reporterName} · {date}</p><h2 className="mt-1 text-title-2-semibold">{state.submitted ? "日报已提交" : "填写日报"}</h2></div>
          <Badge variant="caption" color={state.submitted ? "lime" : "yellow"}>{state.submitted ? "已提交" : "草稿自动保存"}</Badge>
        </div>
      </section>
      <section className="rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
        <div className="mb-4"><h2 className="text-title-2-semibold">今日工作计划 / 进度</h2><p className="mt-1 text-caption-1-regular text-text-secondary">每项填写计划内容、当前进度和工作类型。</p></div>
        <EntryList entries={plans} kind="plan" disabled={disabled} onChange={updatePlans} onAdd={() => updatePlans([...plans, blankEntry("plan")])} />
        {!plans.length && <Input label="没有计划的原因" value={state.content.noPlanReason} onChange={(noPlanReason) => controller.update({ noPlanReason })} isDisabled={disabled} maxLength={200} />}
      </section>
      <section className="rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
        <div className="mb-4"><h2 className="text-title-2-semibold">今日工作内容 / 产出</h2><p className="mt-1 text-caption-1-regular text-text-secondary">工作类型沿用日报统计口径，产出物可以填写多项。</p></div>
        <EntryList entries={works} kind="work" disabled={disabled} onChange={updateWorks} onAdd={() => updateWorks([...works, blankEntry("work")])} />
        {!works.length && <Input className="mt-3" label="没有实际工作的原因" value={state.content.noWorkReason} onChange={(noWorkReason) => controller.update({ noWorkReason })} isDisabled={disabled} maxLength={200} />}
      </section>
      <section className="rounded-2xl border border-status-rose-text/30 bg-background-primary-default p-5 shadow-xs">
        <div className="mb-4"><h2 className="text-title-2-semibold">阻塞事项</h2><p className="mt-1 text-caption-1-regular text-text-secondary">描述需要协调的事项，并关联对应项目。</p></div>
        {blockers.length ? <ul className="flex flex-col gap-3">{blockers.map((blocker, index) => (
          <li key={index} className="rounded-xl border border-border-button-default p-4">
            <div className="flex items-start justify-between gap-3"><span className="text-caption-1-semibold text-status-rose-text">卡点 {index + 1}</span><Button type="button" variant="ghost" size="small" disabled={disabled} onClick={() => updateBlockers(blockers.filter((_, itemIndex) => itemIndex !== index))}>删除</Button></div>
            <Textarea className="mt-3" label="阻塞描述" value={blocker.description} onChange={(description) => updateBlockers(blockers.map((item, itemIndex) => itemIndex === index ? { ...item, description } : item))} isDisabled={disabled} isRequired maxLength={5000} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-caption-1-medium text-text-secondary">关联项目<select value={blocker.projectId} disabled={disabled || !projects.length} onChange={(event) => updateBlockers(blockers.map((item, itemIndex) => itemIndex === index ? { ...item, projectId: event.target.value } : item))} className="min-h-10 rounded-lg border border-border-button-default bg-background-primary-default px-3 text-body-regular text-text-primary">{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
              <label className="flex flex-col gap-1.5 text-caption-1-medium text-text-secondary">严重程度<select value={blocker.severity} disabled={disabled} onChange={(event) => updateBlockers(blockers.map((item, itemIndex) => itemIndex === index ? { ...item, severity: event.target.value as DailyBlocker["severity"] } : item))} className="min-h-10 rounded-lg border border-border-button-default bg-background-primary-default px-3 text-body-regular text-text-primary">{severityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
          </li>
        ))}</ul> : <p className="rounded-xl border border-dashed border-border-button-default p-5 text-body-regular text-text-secondary">今天没有需要协调的阻塞事项。</p>}
        <Button type="button" variant="secondary" className="mt-3" disabled={disabled || !projects.length || blockers.length >= 20} onClick={() => updateBlockers([...blockers, blankBlocker(projects)])}>添加阻塞事项</Button>
        {!projects.length && <p className="mt-2 text-caption-1-regular text-status-rose-text">暂无可关联项目，请先联系管理员配置项目。</p>}
      </section>
      <section className="rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
        <Textarea label="补充说明（可选）" value={state.content.summary} onChange={(summary) => controller.update({ summary })} isDisabled={disabled} maxLength={10000} />
        {!state.submitted && <div className="mt-4 flex flex-wrap gap-3"><Button type="submit" variant="secondary" disabled={state.pending}>{state.pending ? "正在保存…" : "保存草稿"}</Button><Button type="button" disabled={state.pending} onClick={() => setPreview(true)}>预览并提交</Button></div>}
        {state.id && state.submitted && <ButtonLink href={`/reports/${state.id}`} variant="secondary" className="mt-4">查看报告</ButtonLink>}
        {state.message && <p role="status" aria-live="polite" className="mt-3 text-body-regular">{state.message}</p>}
      </section>
      {preview && !state.submitted && <section aria-label="提交预览" className="rounded-2xl border border-accent-600/30 bg-background-primary-default p-5 shadow-xs"><h2 className="text-title-2-semibold">提交预览</h2><p className="mt-1 text-body-regular text-text-secondary">汇报人：{reporterName} · {date} · 计划 {plans.length} 项 · 工作 {works.length} 项 · 阻塞 {blockers.length} 项</p><PreviewEntries title="工作计划 / 进度" entries={plans} /><PreviewEntries title="工作内容 / 产出" entries={works} />{blockers.length > 0 && <div className="mt-5"><h3 className="text-body-medium">阻塞事项</h3><ul className="mt-2 flex flex-col gap-2 text-body-regular">{blockers.map((blocker, index) => <li key={index}>{blocker.description} · {projects.find((item) => item.id === blocker.projectId)?.name ?? "未关联项目"}</li>)}</ul></div>}<div className="mt-5 flex flex-wrap gap-3"><Button type="button" disabled={state.pending} onClick={() => void saveSubmit()}>确认提交</Button><Button type="button" variant="secondary" disabled={submitting} onClick={() => setPreview(false)}>继续编辑</Button></div></section>}
      {remote && <section aria-label="版本冲突" className="rounded-2xl border border-status-rose-text/30 p-5"><h2 className="text-title-2-semibold">远端已有更新</h2><p className="mt-1 text-body-regular text-text-secondary">请先选择保留哪一版内容。</p><div className="mt-4 flex flex-wrap gap-3"><Button type="button" variant="secondary" disabled={state.pending} onClick={() => { if (controller.resolve(remote, false)) { setRemote(null); setPreview(false); } }}>使用远端内容</Button>{remote.status === "DRAFT" ? <Button type="button" disabled={state.pending} onClick={() => { if (controller.resolve(remote, true)) { setRemote(null); void controller.save(false); } }}>保存本地内容</Button> : <ButtonLink href={`/reports/${remote.id}`} variant="secondary">查看已提交报告</ButtonLink>}</div></section>}
    </form>
  );
}

function PreviewEntries({ title, entries }: { title: string; entries: DailyEntry[] }) {
  return <section className="mt-5"><h3 className="text-body-medium">{title}</h3>{entries.length ? <ol className="mt-2 flex flex-col gap-2 text-body-regular">{entries.map((entry, index) => <li key={index}>{index + 1}、{entry.content}（{statusLabel[entry.status]}）｜类型：{entry.category}{entry.deliverables.length ? `｜产出：${entry.deliverables.join(" ")}` : ""}</li>)}</ol> : <p className="mt-2 text-body-regular text-text-secondary">暂无条目</p>}</section>;
}
