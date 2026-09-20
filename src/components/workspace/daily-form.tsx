"use client";

import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, ButtonLink } from "@/components/motion/button/base";
import { Badge } from "@/components/premium/badge";
import {
  Card,
  CardBody,
  CardHeader,
} from "@/components/premium/cards/card";
import {
  Checkbox,
  Input,
  Select,
  SelectItem,
  Textarea,
} from "@/components/premium/forms";
import { remoteDailyDraft, type RemoteDailyDraft } from "@/lib/daily-conflict";
import { DailyDraftController } from "@/lib/daily-draft-controller";
import {
  dailyBlockersSchema,
  dailyEntriesSchema,
  type DailyBlocker,
  type DailyEntry,
} from "@/lib/daily-input";

type Project = { id: string; name: string };
type EntryKind = "plan" | "work";

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

function blankEntry(kind: EntryKind): DailyEntry {
  return {
    content: "",
    status: kind === "plan" ? "TODO" : "DONE",
    category: "综合事务",
    deliverables: [],
    projectId: null,
  };
}

function blankBlocker(projects: Project[]): DailyBlocker {
  return {
    description: "",
    projectId: projects[0]?.id ?? "",
    severity: "NORMAL",
  };
}

function isSameWork(plan: DailyEntry, work: DailyEntry) {
  return (
    plan.content.trim() !== "" &&
    plan.content.trim() === work.content.trim() &&
    plan.category === work.category &&
    (plan.projectId ?? null) === (work.projectId ?? null)
  );
}

function EntryEditor({
  entry,
  index,
  kind,
  projects,
  disabled,
  reconciled = false,
  onChange,
  onRemove,
  onReconcile,
}: {
  entry: DailyEntry;
  index: number;
  kind: EntryKind;
  projects: Project[];
  disabled: boolean;
  reconciled?: boolean;
  onChange: (entry: DailyEntry) => void;
  onRemove: () => void;
  onReconcile?: () => void;
}) {
  const set = (patch: Partial<DailyEntry>) => onChange({ ...entry, ...patch });
  const number = String(index + 1).padStart(2, "0");

  return (
    <div
      role="listitem"
      className="group border-b border-border/70 py-4 last:border-b-0"
    >
      <div className="mb-3 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">
          {number}
        </span>
        <Badge variant="caption" color={kind === "plan" ? "blue" : "lime"}>
          {entry.category}
        </Badge>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {projects.find((item) => item.id === entry.projectId)?.name ??
            "未关联项目"}
        </span>
        {kind === "plan" && onReconcile ? (
          <Button
            type="button"
            variant="ghost"
            size="small"
            disabled={disabled || reconciled || !entry.content.trim()}
            onClick={onReconcile}
            className="shrink-0 text-primary"
          >
            {reconciled ? "已核销" : "核销完成"}
            {!reconciled && <ArrowRight className="size-3.5" aria-hidden />}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          iconOnly
          disabled={disabled}
          onClick={onRemove}
          aria-label={`删除第 ${index + 1} 项${kind === "plan" ? "计划" : "工作内容"}`}
          className="text-muted-foreground"
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>

      <Textarea
        aria-label={kind === "plan" ? "计划内容" : "工作内容"}
        value={entry.content}
        onChange={(content) => set({ content })}
        placeholder={
          kind === "plan"
            ? "填写计划内容和预期结果"
            : "填写实际完成的工作内容"
        }
        isDisabled={disabled}
        isRequired
        rows={2}
        maxLength={5000}
        className="min-h-20 resize-y"
      />

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Select
          aria-label="工作类型"
          selectedKey={entry.category}
          onSelectionChange={(category) => set({ category })}
          isDisabled={disabled}
          triggerClassName="min-h-9"
        >
          {categoryOptions.map((category) => (
            <SelectItem key={category} id={category}>
              {category}
            </SelectItem>
          ))}
        </Select>
        <Select
          aria-label="工作进度"
          selectedKey={entry.status}
          onSelectionChange={(status) =>
            set({ status: status as DailyEntry["status"] })
          }
          isDisabled={disabled}
          triggerClassName="min-h-9"
        >
          {statusOptions.map(([value, label]) => (
            <SelectItem key={value} id={value}>
              {label}
            </SelectItem>
          ))}
        </Select>
        <Select
          aria-label="关联项目"
          selectedKey={entry.projectId ?? "NONE"}
          onSelectionChange={(projectId) =>
            set({ projectId: projectId === "NONE" ? null : projectId })
          }
          isDisabled={disabled}
          triggerClassName="min-h-9"
        >
          <SelectItem id="NONE">未关联项目</SelectItem>
          {projects.map((item) => (
            <SelectItem key={item.id} id={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </Select>
      </div>

      {kind === "work" ? (
        <div className="mt-3 space-y-2">
          {entry.deliverables.map((deliverable, deliverableIndex) => (
            <div
              key={`${index}-${deliverableIndex}`}
              className="flex items-center gap-2"
            >
              <Input
                aria-label={`第 ${index + 1} 项产出物 ${deliverableIndex + 1}`}
                value={deliverable}
                onChange={(value) =>
                  set({
                    deliverables: entry.deliverables.map((item, itemIndex) =>
                      itemIndex === deliverableIndex ? value : item,
                    ),
                  })
                }
                placeholder="产出，如：教材 1 本、章节 13 章"
                isDisabled={disabled}
                size="small"
                maxLength={200}
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                iconOnly
                disabled={disabled}
                onClick={() =>
                  set({
                    deliverables: entry.deliverables.filter(
                      (_, itemIndex) => itemIndex !== deliverableIndex,
                    ),
                  })
                }
                aria-label={`移除第 ${deliverableIndex + 1} 项产出物`}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="small"
            disabled={disabled || entry.deliverables.length >= 20}
            onClick={() =>
              set({ deliverables: [...entry.deliverables, ""] })
            }
            className="text-primary"
          >
            <Plus className="size-3.5" aria-hidden />
            添加产出
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function EmptyColumn({ kind }: { kind: EntryKind }) {
  return (
    <div className="grid min-h-36 place-items-center rounded-lg border border-dashed border-border bg-muted/30 px-6 text-center">
      <div>
        {kind === "plan" ? (
          <CalendarDays className="mx-auto size-5 text-muted-foreground" aria-hidden />
        ) : (
          <CheckCircle2 className="mx-auto size-5 text-muted-foreground" aria-hidden />
        )}
        <p className="mt-2 text-sm font-medium text-foreground">
          {kind === "plan" ? "今天还没有工作计划" : "还没有实际完成项"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {kind === "plan"
            ? "添加计划后，可从这里直接核销。"
            : "从左侧核销计划，或插入临时工作。"}
        </p>
      </div>
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
  const router = useRouter();
  const initialPlans = dailyEntriesSchema.safeParse(draft?.planEntries).success
    ? dailyEntriesSchema.parse(draft?.planEntries)
    : [];
  const initialWorks = dailyEntriesSchema.safeParse(draft?.workEntries).success
    ? dailyEntriesSchema.parse(draft?.workEntries)
    : [];
  const initialBlockers = dailyBlockersSchema.safeParse(draft?.blockers).success
    ? dailyBlockersSchema.parse(draft?.blockers)
    : [];
  const [selectedDate, setSelectedDate] = useState(date);
  const [blockerOpen, setBlockerOpen] = useState(initialBlockers.length > 0);
  const [remote, setRemote] = useState<RemoteDailyDraft | null>(null);
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [controller] = useState(
    () =>
      new DailyDraftController(
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
              body: JSON.stringify({
                ...content,
                plans: content.plans ?? [],
                works: content.works ?? [],
                blockers: content.blockers ?? [],
                reportDate: date,
                version,
                submit,
              }),
            });
          } catch {
            throw new Error("网络异常，内容仍保留在本地，请稍后重试。");
          }
          const result = await response.json();
          if (response.status === 409) {
            const conflict = remoteDailyDraft.safeParse(result.remote);
            if (conflict.success) setRemote(conflict.data);
          }
          if (!response.ok)
            throw new Error(result.error ?? "保存失败，请稍后重试");
          return result;
        },
      ),
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.snapshot,
    controller.snapshot,
  );

  useEffect(() => {
    if (!state.dirty && !state.pending) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [state.dirty, state.pending]);

  const disabled = state.submitted || submitting;
  const plans = state.content.plans ?? [];
  const works = state.content.works ?? [];
  const blockers = state.content.blockers ?? [];
  const completedPlans = plans.filter((item) => item.status === "DONE").length;
  const completedWorks = works.filter((item) => item.status === "DONE").length;
  const fulfillment = plans.length
    ? Math.round((completedPlans / plans.length) * 100)
    : 0;
  const updatePlans = (next: DailyEntry[]) => controller.update({ plans: next });
  const updateWorks = (next: DailyEntry[]) => controller.update({ works: next });
  const updateBlockers = (next: DailyBlocker[]) =>
    controller.update({ blockers: next });

  const reconcilePlan = (index: number) => {
    const plan = plans[index];
    if (!plan || !plan.content.trim()) return;
    updatePlans(
      plans.map((item, itemIndex) =>
        itemIndex === index ? { ...item, status: "DONE" } : item,
      ),
    );
    if (!works.some((work) => isSameWork(plan, work))) {
      updateWorks([...works, { ...plan, status: "DONE", deliverables: [] }]);
    }
  };

  const toggleBlockers = (selected: boolean) => {
    setBlockerOpen(selected);
    if (!selected) {
      updateBlockers([]);
      return;
    }
    if (!blockers.length && projects.length) {
      updateBlockers([blankBlocker(projects)]);
    }
  };

  const saveSubmit = async () => {
    setSubmitting(true);
    try {
      await controller.save(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void controller.save(false);
      }}
      className="mx-auto flex w-full max-w-7xl flex-col gap-4"
    >
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-primary">今日工作</p>
            <Badge variant="caption" color={state.submitted ? "lime" : "yellow"}>
              {state.submitted
                ? "已提交"
                : state.pending
                  ? "正在同步"
                  : state.dirty
                    ? "待同步"
                    : "草稿已同步"}
            </Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">今日工作台</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            汇报人：{reporterName}，计划与实际在同一处核销。
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            type="date"
            label="报告日期"
            value={selectedDate}
            onChange={setSelectedDate}
            size="small"
            className="w-44"
          />
          <Button
            type="button"
            variant="secondary"
            size="medium"
            disabled={!selectedDate || selectedDate === date || state.dirty}
            onClick={() => router.push(`/daily?date=${selectedDate}`)}
          >
            打开日报
          </Button>
        </div>
      </header>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="size-4 text-primary" aria-hidden />
              <h2 className="text-base font-semibold text-foreground">今日计划与实际</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              左侧维护计划，核销后自动带入右侧实际完成。
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {date.replaceAll("-", ".")} · {plans.length} 项计划 · {works.length} 项实际
          </span>
        </CardHeader>

        <CardBody className="grid min-w-0 p-0 lg:grid-cols-2 lg:divide-x lg:divide-border">
          <section className="min-w-0 border-b border-border p-5 lg:border-b-0">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">今日工作计划</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {completedPlans}/{plans.length} 项已核销
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="small"
                disabled={disabled || plans.length >= 100}
                onClick={() => updatePlans([...plans, blankEntry("plan")])}
              >
                <Plus className="size-3.5" aria-hidden />
                添加计划
              </Button>
            </div>
            {plans.length ? (
              <div role="list">
                {plans.map((entry, index) => (
                  <EntryEditor
                    key={index}
                    entry={entry}
                    index={index}
                    kind="plan"
                    projects={projects}
                    disabled={disabled}
                    reconciled={works.some((work) => isSameWork(entry, work))}
                    onChange={(next) =>
                      updatePlans(plans.map((item, itemIndex) => itemIndex === index ? next : item))
                    }
                    onRemove={() =>
                      updatePlans(plans.filter((_, itemIndex) => itemIndex !== index))
                    }
                    onReconcile={() => reconcilePlan(index)}
                  />
                ))}
              </div>
            ) : (
              <>
                <EmptyColumn kind="plan" />
                <Input
                  className="mt-3"
                  label="没有计划的原因"
                  value={state.content.noPlanReason}
                  onChange={(noPlanReason) => controller.update({ noPlanReason })}
                  isDisabled={disabled}
                  maxLength={200}
                />
              </>
            )}
          </section>

          <section className="min-w-0 p-5">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">今日实际完成</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {completedWorks}/{works.length} 项已完成
              </p>
            </div>
            {works.length ? (
              <div role="list">
                {works.map((entry, index) => (
                  <EntryEditor
                    key={index}
                    entry={entry}
                    index={index}
                    kind="work"
                    projects={projects}
                    disabled={disabled}
                    onChange={(next) =>
                      updateWorks(works.map((item, itemIndex) => itemIndex === index ? next : item))
                    }
                    onRemove={() =>
                      updateWorks(works.filter((_, itemIndex) => itemIndex !== index))
                    }
                  />
                ))}
              </div>
            ) : (
              <>
                <EmptyColumn kind="work" />
                <Input
                  className="mt-3"
                  label="没有实际工作的原因"
                  value={state.content.noWorkReason}
                  onChange={(noWorkReason) => controller.update({ noWorkReason })}
                  isDisabled={disabled}
                  maxLength={200}
                />
              </>
            )}
            <Button
              type="button"
              variant="ghost"
              size="small"
              disabled={disabled || works.length >= 100}
              onClick={() => updateWorks([...works, blankEntry("work")])}
              className="mt-3 text-primary"
            >
              <Plus className="size-3.5" aria-hidden />
              插入临时工作
            </Button>
          </section>
        </CardBody>

        <div className="border-t border-border bg-muted/20 px-5 py-4">
          <Checkbox isSelected={blockerOpen} onChange={toggleBlockers} isDisabled={disabled}>
            <span className="font-medium text-foreground">今日存在卡点或需协调事项</span>
          </Checkbox>

          {blockerOpen ? (
            <div className="mt-3 rounded-lg border border-status-rose-border bg-status-rose-background p-4">
              {projects.length ? (
                <div className="space-y-3">
                  {blockers.map((blocker, index) => (
                    <div
                      key={index}
                      className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_180px_140px_auto] lg:items-end"
                    >
                      <Textarea
                        label={`卡点 ${index + 1}`}
                        value={blocker.description}
                        onChange={(description) =>
                          updateBlockers(blockers.map((item, itemIndex) => itemIndex === index ? { ...item, description } : item))
                        }
                        placeholder="说明需要协调的事项"
                        isDisabled={disabled}
                        isRequired
                        rows={2}
                        maxLength={5000}
                        className="min-h-20"
                      />
                      <Select
                        aria-label={`卡点 ${index + 1} 关联项目`}
                        selectedKey={blocker.projectId}
                        onSelectionChange={(projectId) =>
                          updateBlockers(blockers.map((item, itemIndex) => itemIndex === index ? { ...item, projectId } : item))
                        }
                        isDisabled={disabled}
                      >
                        {projects.map((item) => (
                          <SelectItem key={item.id} id={item.id}>{item.name}</SelectItem>
                        ))}
                      </Select>
                      <Select
                        aria-label={`卡点 ${index + 1} 严重程度`}
                        selectedKey={blocker.severity}
                        onSelectionChange={(severity) =>
                          updateBlockers(blockers.map((item, itemIndex) => itemIndex === index ? { ...item, severity: severity as DailyBlocker["severity"] } : item))
                        }
                        isDisabled={disabled}
                      >
                        {severityOptions.map(([value, label]) => (
                          <SelectItem key={value} id={value}>{label}</SelectItem>
                        ))}
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        iconOnly
                        disabled={disabled}
                        onClick={() => {
                          const next = blockers.filter((_, itemIndex) => itemIndex !== index);
                          updateBlockers(next);
                          if (!next.length) setBlockerOpen(false);
                        }}
                        aria-label={`删除卡点 ${index + 1}`}
                        className="text-status-rose-text"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    disabled={disabled || blockers.length >= 20}
                    onClick={() => updateBlockers([...blockers, blankBlocker(projects)])}
                    className="text-status-rose-text"
                  >
                    <Plus className="size-3.5" aria-hidden />
                    添加卡点
                  </Button>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-status-rose-text">
                  <AlertTriangle className="size-4 shrink-0" aria-hidden />
                  暂无可关联项目，请联系管理员配置项目。
                </p>
              )}
            </div>
          ) : null}

          <Textarea
            label="补充说明（可选）"
            value={state.content.summary}
            onChange={(summary) => controller.update({ summary })}
            placeholder="补充今天需要说明的信息"
            isDisabled={disabled}
            rows={2}
            maxLength={10000}
            className="mt-3 min-h-20"
          />
        </div>
      </Card>

      {preview && !state.submitted ? (
        <Card aria-label="提交预览">
          <CardHeader className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">提交预览</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {reporterName} · {date} · 计划 {plans.length} 项 · 实际 {works.length} 项
              </p>
            </div>
            <Button type="button" variant="ghost" size="small" onClick={() => setPreview(false)}>
              继续编辑
            </Button>
          </CardHeader>
          <CardBody className="grid gap-5 lg:grid-cols-2">
            <PreviewEntries title="工作计划 / 进度" entries={plans} />
            <PreviewEntries title="工作内容 / 产出" entries={works} />
            {blockers.length ? (
              <div className="lg:col-span-2">
                <h3 className="text-sm font-semibold text-status-rose-text">阻塞事项</h3>
                <ul className="mt-2 space-y-1 text-sm text-foreground">
                  {blockers.map((blocker, index) => (
                    <li key={index}>
                      {index + 1}. {blocker.description}，{projects.find((item) => item.id === blocker.projectId)?.name ?? "未关联项目"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex justify-end lg:col-span-2">
              <Button type="button" disabled={state.pending || submitting} onClick={() => void saveSubmit()}>
                {submitting ? "正在提交" : "确认提交"}
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {remote ? (
        <Card className="border-status-rose-border">
          <CardBody>
            <h2 className="text-base font-semibold text-foreground">远端已有更新</h2>
            <p className="mt-1 text-sm text-muted-foreground">请选择保留远端版本或当前编辑内容。</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={state.pending}
                onClick={() => {
                  if (controller.resolve(remote, false)) {
                    setRemote(null);
                    setPreview(false);
                  }
                }}
              >
                使用远端内容
              </Button>
              {remote.status === "DRAFT" ? (
                <Button
                  type="button"
                  disabled={state.pending}
                  onClick={() => {
                    if (controller.resolve(remote, true)) {
                      setRemote(null);
                      void controller.save(false);
                    }
                  }}
                >
                  保存当前内容
                </Button>
              ) : (
                <ButtonLink href={`/reports/${remote.id}`} variant="secondary">查看已提交报告</ButtonLink>
              )}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-3 border-t border-border bg-card/95 py-3 pr-4 pl-16 shadow-[0_-8px_24px_-20px_rgba(15,23,42,0.45)] backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-t-xl sm:border-x sm:px-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            今日计划 {plans.length} 项 · 已完成 {completedWorks} 项 · 达成率 {fulfillment}%
          </p>
          {state.message ? (
            <p role="status" aria-live="polite" className="mt-0.5 truncate text-xs text-muted-foreground">
              {state.message}
            </p>
          ) : null}
        </div>
        {state.submitted ? (
          state.id ? <ButtonLink href={`/reports/${state.id}`} variant="secondary">查看已提交日报</ButtonLink> : null
        ) : (
          <div className="flex shrink-0 gap-2">
            <Button type="submit" variant="secondary" disabled={state.pending || submitting}>
              {state.pending ? "正在保存" : "保存草稿"}
            </Button>
            <Button type="button" disabled={state.pending || submitting} onClick={() => setPreview(true)}>
              预览并提交
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}

function PreviewEntries({ title, entries }: { title: string; entries: DailyEntry[] }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {entries.length ? (
        <ol className="mt-2 space-y-2 text-sm text-foreground">
          {entries.map((entry, index) => (
            <li key={index}>
              {index + 1}. {entry.content}（{statusLabel[entry.status]}）｜类型：{entry.category}
              {entry.deliverables.length ? `｜产出：${entry.deliverables.join(" ")}` : ""}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">暂无条目</p>
      )}
    </section>
  );
}
