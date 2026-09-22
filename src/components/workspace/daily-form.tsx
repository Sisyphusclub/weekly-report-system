"use client";

import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, ButtonLink } from "@/components/motion/button/base";
import { useAnimatedSidebar } from "@/components/motion/animated-sidebar";
import { Badge, Tag } from "@/components/premium/badge";
import { Card, CardBody, CardHeader } from "@/components/premium/cards/card";
import { FooterToolbar } from "@/components/premium/footer-toolbar";
import {
  Checkbox,
  DatePicker,
  Input,
  Select,
  SelectItem,
  Textarea,
} from "@/components/premium/forms";
import { Col, Row } from "@/components/premium/layout";
import { List, ListItem } from "@/components/premium/list";
import { Modal } from "@/components/premium/modal";
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
type EntryModalState = { kind: EntryKind; index: number | null };

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

function projectName(entry: DailyEntry, projects: Project[]) {
  return (
    projects.find((item) => item.id === entry.projectId)?.name ?? "未关联项目"
  );
}

function formatReportDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  const weekday = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "UTC",
    weekday: "short",
  }).format(new Date(Date.UTC(year, month - 1, day)));
  return `${String(year)}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")} (${weekday})`;
}

function ReportDateControl({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <DatePicker
      value={value}
      onChange={onChange}
      aria-label="报告日期"
      isDisabled={disabled}
      placeholder="选择报告日期"
      formatValue={formatReportDate}
      triggerClassName="h-8 min-h-8 rounded-lg border-slate-200 bg-white px-3 text-xs text-slate-700"
    />
  );
}

function PlanListItem({
  entry,
  index,
  projects,
  disabled,
  reconciled,
  onEdit,
  onRemove,
  onReconcile,
}: {
  entry: DailyEntry;
  index: number;
  projects: Project[];
  disabled: boolean;
  reconciled: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onReconcile: () => void;
}) {
  return (
    <ListItem
      index={String(index + 1).padStart(2, "0")}
      title={
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <Tag color="neutral">{projectName(entry, projects)}</Tag>
            <p className="min-w-0 truncate text-sm font-medium text-slate-800">
              {entry.content}
            </p>
          </div>
          <p className="mt-1 text-xs text-slate-500">{entry.category}</p>
        </div>
      }
      trailing={
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={disabled}
            onClick={onEdit}
            aria-label={`编辑第 ${index + 1} 项计划`}
            className="text-slate-500 hover:text-slate-900"
          >
            <Pencil className="size-3.5" aria-hidden />
          </Button>
          {reconciled ? (
            <span className="text-xs text-slate-400">✓ 已核销</span>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={disabled || !entry.content.trim()}
              onClick={onReconcile}
              className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 hover:text-blue-700"
            >
              核销完成
              <ArrowRight className="size-3.5" aria-hidden />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            iconOnly
            disabled={disabled}
            onClick={onRemove}
            aria-label={`删除第 ${index + 1} 项计划`}
            className="text-slate-400 hover:text-rose-700"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </Button>
        </div>
      }
    />
  );
}

function WorkListItem({
  entry,
  index,
  projects,
  disabled,
  onEdit,
  onRemove,
}: {
  entry: DailyEntry;
  index: number;
  projects: Project[];
  disabled: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const deliverables = entry.deliverables.length
    ? entry.deliverables.join("、")
    : "未登记产出";
  return (
    <ListItem
      index={String(index + 1).padStart(2, "0")}
      title={
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Tag color="neutral">{projectName(entry, projects)}</Tag>
            <p className="min-w-0 truncate text-sm font-medium text-slate-800">
              {entry.content}
            </p>
            <Badge
              status="success"
              text="已完成"
              className="ml-auto shrink-0"
            />
          </div>
          <div className="flex min-w-0 items-center gap-2 pl-0.5">
            <Tag color="processing">产出：{deliverables}</Tag>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={disabled}
                onClick={onEdit}
                aria-label={`编辑第 ${index + 1} 项实际工作`}
                className="text-slate-500 hover:text-slate-900"
              >
                <Pencil className="size-3.5" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                iconOnly
                disabled={disabled}
                onClick={onRemove}
                aria-label={`删除第 ${index + 1} 项实际工作`}
                className="text-slate-400 hover:text-rose-700"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      }
    />
  );
}

function EmptyColumn({ kind }: { kind: EntryKind }) {
  return (
    <div className="grid min-h-36 place-items-center rounded-lg border border-dashed border-border bg-muted/30 px-6 text-center">
      <div>
        {kind === "plan" ? (
          <CalendarDays
            className="mx-auto size-5 text-muted-foreground"
            aria-hidden
          />
        ) : (
          <CheckCircle2
            className="mx-auto size-5 text-muted-foreground"
            aria-hidden
          />
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
  const { state: sidebarState } = useAnimatedSidebar();
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
  const [entryModal, setEntryModal] = useState<EntryModalState | null>(null);
  const [entryDraft, setEntryDraft] = useState<DailyEntry | null>(null);
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
  const reconciledPlans = plans.filter((plan) =>
    works.some((work) => isSameWork(plan, work)),
  ).length;
  const completedWorks = works.filter((item) => item.status === "DONE").length;
  const fulfillment = plans.length
    ? Math.round((reconciledPlans / plans.length) * 100)
    : 0;
  const updatePlans = (next: DailyEntry[]) =>
    controller.update({ plans: next });
  const updateWorks = (next: DailyEntry[]) =>
    controller.update({ works: next });
  const updateBlockers = (next: DailyBlocker[]) =>
    controller.update({ blockers: next });

  const openEntryModal = (kind: EntryKind, index: number | null = null) => {
    const source = kind === "plan" ? plans : works;
    const entry = index === null ? blankEntry(kind) : source[index];
    if (!entry) return;
    setEntryDraft({ ...entry, deliverables: [...entry.deliverables] });
    setEntryModal({ kind, index });
  };

  const closeEntryModal = () => {
    setEntryModal(null);
    setEntryDraft(null);
  };

  const saveEntryDraft = () => {
    if (!entryModal || !entryDraft || !entryDraft.content.trim()) return;
    const collection = entryModal.kind === "plan" ? plans : works;
    const next = [...collection];
    const normalized = {
      ...entryDraft,
      deliverables: entryDraft.deliverables.filter((item) => item.trim()),
    };
    if (entryModal.index === null) next.push(normalized);
    else next[entryModal.index] = normalized;
    if (entryModal.kind === "plan") updatePlans(next);
    else updateWorks(next);
    closeEntryModal();
  };

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
      className={`mx-auto flex w-full max-w-7xl flex-col gap-4 ${!preview ? "pb-20" : ""}`}
    >
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-primary">今日工作</p>
            <Badge
              variant="caption"
              color={state.submitted ? "success" : "warning"}
            >
              {state.submitted
                ? "已提交"
                : state.pending
                  ? "正在同步"
                  : state.dirty
                    ? "待同步"
                    : "草稿已同步"}
            </Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            今日工作台
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            汇报人：{reporterName}，计划与实际在同一处核销。
          </p>
        </div>
      </header>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="size-4 text-primary" aria-hidden />
              <h2 className="text-base font-semibold text-foreground">
                今日计划与实际
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              左侧维护计划，核销后自动带入右侧实际完成。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ReportDateControl
              value={selectedDate}
              disabled={state.dirty || state.pending || submitting}
              onChange={(nextDate) => {
                setSelectedDate(nextDate);
                if (nextDate && nextDate !== date && !state.dirty) {
                  router.push(`/daily?date=${nextDate}`);
                }
              }}
            />
            <Button
              type="button"
              size="small"
              disabled={disabled || plans.length >= 100}
              onClick={() => openEntryModal("plan")}
            >
              <Plus className="size-3.5" aria-hidden />
              添加计划
            </Button>
          </div>
        </CardHeader>

        <CardBody className="min-w-0 p-0">
          <Row className="min-w-0 lg:items-stretch">
            <Col
              span={12}
              lg={6}
              className="flex min-w-0 flex-col border-b border-border p-5 lg:border-b-0"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    今日工作计划
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {reconciledPlans}/{plans.length} 项已核销
                  </p>
                </div>
              </div>
              {plans.length ? (
                <List
                  dataSource={plans}
                  rowKey={(_, index) => `plan-${index}`}
                  itemClassName="min-h-[96px] border-slate-200 bg-slate-50/70 lg:h-[96px] lg:overflow-hidden"
                  renderItem={(entry, index) => (
                    <PlanListItem
                      entry={entry}
                      index={index}
                      projects={projects}
                      disabled={disabled}
                      reconciled={works.some((work) => isSameWork(entry, work))}
                      onEdit={() => openEntryModal("plan", index)}
                      onRemove={() =>
                        updatePlans(
                          plans.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      onReconcile={() => reconcilePlan(index)}
                    />
                  )}
                />
              ) : (
                <>
                  <EmptyColumn kind="plan" />
                  <Input
                    className="mt-3"
                    label="没有计划的原因"
                    value={state.content.noPlanReason}
                    onChange={(noPlanReason) =>
                      controller.update({ noPlanReason })
                    }
                    isDisabled={disabled}
                    maxLength={200}
                  />
                </>
              )}
            </Col>

            <Col
              span={12}
              lg={6}
              className="flex min-w-0 flex-col border-l border-slate-100 p-5"
            >
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  今日实际完成
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {completedWorks}/{works.length} 项已完成
                </p>
              </div>
              {works.length ? (
                <List
                  dataSource={works}
                  rowKey={(_, index) => `work-${index}`}
                  itemClassName="min-h-[96px] border-slate-200 bg-white shadow-xs lg:h-[96px] lg:overflow-hidden"
                  renderItem={(entry, index) => (
                    <WorkListItem
                      entry={entry}
                      index={index}
                      projects={projects}
                      disabled={disabled}
                      onEdit={() => openEntryModal("work", index)}
                      onRemove={() =>
                        updateWorks(
                          works.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    />
                  )}
                />
              ) : (
                <>
                  <EmptyColumn kind="work" />
                  <Input
                    className="mt-3"
                    label="没有实际工作的原因"
                    value={state.content.noWorkReason}
                    onChange={(noWorkReason) =>
                      controller.update({ noWorkReason })
                    }
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
                onClick={() => openEntryModal("work")}
                className="mt-3 text-primary"
              >
                <Plus className="size-3.5" aria-hidden />
                插入临时工作
              </Button>
            </Col>
          </Row>
        </CardBody>

        <div className="border-t border-slate-100 bg-slate-50/60 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Checkbox
              isSelected={blockerOpen}
              onChange={toggleBlockers}
              isDisabled={disabled}
            >
              <span className="font-medium text-slate-800">
                今日存在卡点或阻碍事项
              </span>
            </Checkbox>
            <span className="text-xs text-slate-500">
              勾选后展开输入卡点和关联项目
            </span>
          </div>

          {blockerOpen ? (
            <div className="mt-3 border-t border-border pt-4">
              {projects.length ? (
                <div className="space-y-3">
                  {blockers.map((blocker, index) => (
                    <div
                      key={index}
                      className="grid min-w-0 gap-x-3 gap-y-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(170px,220px)_minmax(120px,160px)_auto] lg:items-start"
                    >
                      <Textarea
                        label={`卡点 ${index + 1}`}
                        value={blocker.description}
                        onChange={(description) =>
                          updateBlockers(
                            blockers.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, description }
                                : item,
                            ),
                          )
                        }
                        placeholder="说明需要协调的事项"
                        isDisabled={disabled}
                        isRequired
                        rows={2}
                        maxLength={5000}
                        className="min-h-20"
                      />
                      <div className="min-w-0 space-y-1.5">
                        <span className="block px-1 text-xs font-medium text-slate-600">
                          关联项目
                        </span>
                        <Select
                          aria-label={`卡点 ${index + 1} 关联项目`}
                          selectedKey={blocker.projectId}
                          onSelectionChange={(projectId) =>
                            updateBlockers(
                              blockers.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, projectId }
                                  : item,
                              ),
                            )
                          }
                          isDisabled={disabled}
                          triggerClassName="min-h-10"
                        >
                          {projects.map((item) => (
                            <SelectItem key={item.id} id={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </Select>
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <span className="block px-1 text-xs font-medium text-slate-600">
                          严重程度
                        </span>
                        <Select
                          aria-label={`卡点 ${index + 1} 严重程度`}
                          selectedKey={blocker.severity}
                          onSelectionChange={(severity) =>
                            updateBlockers(
                              blockers.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      severity:
                                        severity as DailyBlocker["severity"],
                                    }
                                  : item,
                              ),
                            )
                          }
                          isDisabled={disabled}
                          triggerClassName="min-h-10"
                        >
                          {severityOptions.map(([value, label]) => (
                            <SelectItem key={value} id={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        iconOnly
                        disabled={disabled}
                        onClick={() => {
                          const next = blockers.filter(
                            (_, itemIndex) => itemIndex !== index,
                          );
                          updateBlockers(next);
                          if (!next.length) setBlockerOpen(false);
                        }}
                        aria-label={`删除卡点 ${index + 1}`}
                        className="mt-0 text-rose-700 lg:mt-6"
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
                    onClick={() =>
                      updateBlockers([...blockers, blankBlocker(projects)])
                    }
                    className="mt-0.5 text-rose-700"
                  >
                    <Plus className="size-3.5" aria-hidden />
                    添加卡点
                  </Button>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-rose-700">
                  <AlertTriangle className="size-4 shrink-0" aria-hidden />
                  暂无可关联项目，请联系管理员配置项目。
                </p>
              )}
            </div>
          ) : null}

          <Input
            label="补充说明（可选）"
            value={state.content.summary}
            onChange={(summary) => controller.update({ summary })}
            placeholder="补充今日渠道数据与协同事项…"
            isDisabled={disabled}
            maxLength={10000}
            size="small"
            className="mt-3"
          />
        </div>
      </Card>

      {preview && !state.submitted ? (
        <Card aria-label="提交预览">
          <CardHeader className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                提交预览
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {reporterName} · {date} · 计划 {plans.length} 项 · 实际{" "}
                {works.length} 项
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="small"
              onClick={() => setPreview(false)}
            >
              继续编辑
            </Button>
          </CardHeader>
          <CardBody className="grid items-start gap-3 px-4 py-3 lg:grid-cols-2">
            <PreviewEntries title="工作计划 / 进度" entries={plans} />
            <PreviewEntries title="工作内容 / 产出" entries={works} />
            {blockers.length ? (
              <div className="border-t border-rose-200 pt-3 lg:col-span-2">
                <h3 className="text-sm font-semibold text-rose-700">
                  阻塞事项
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-foreground">
                  {blockers.map((blocker, index) => (
                    <li key={index}>
                      {index + 1}. {blocker.description}，
                      {projects.find((item) => item.id === blocker.projectId)
                        ?.name ?? "未关联项目"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex justify-end border-t border-border pt-3 lg:col-span-2">
              <Button
                type="button"
                disabled={state.pending || submitting}
                onClick={() => void saveSubmit()}
              >
                {submitting ? "正在提交" : "确认提交"}
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {remote ? (
        <Card className="border-rose-200">
          <CardBody>
            <h2 className="text-base font-semibold text-foreground">
              远端已有更新
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              请选择保留远端版本或当前编辑内容。
            </p>
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
                <ButtonLink href={`/reports/${remote.id}`} variant="secondary">
                  查看已提交报告
                </ButtonLink>
              )}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {entryModal && entryDraft ? (
        <Modal
          open
          onClose={closeEntryModal}
          title={
            entryModal.index === null
              ? entryModal.kind === "plan"
                ? "添加工作计划"
                : "插入临时工作"
              : "编辑日报条目"
          }
          description="保存后条目会回到双栏列表，列表中只展示已保存内容。"
          footer={
            <>
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={closeEntryModal}
              >
                取消
              </Button>
              <Button
                type="button"
                size="small"
                disabled={!entryDraft.content.trim()}
                onClick={saveEntryDraft}
              >
                保存条目
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Textarea
              label={entryModal.kind === "plan" ? "计划内容" : "实际工作内容"}
              value={entryDraft.content}
              onChange={(content) => setEntryDraft({ ...entryDraft, content })}
              placeholder={
                entryModal.kind === "plan"
                  ? "填写计划内容和预期结果"
                  : "填写实际完成的工作内容"
              }
              isDisabled={disabled}
              isRequired
              rows={3}
              maxLength={5000}
            />
            <Row gap="sm">
              <Col span={12} md={6}>
                <Select
                  aria-label="工作类型"
                  selectedKey={entryDraft.category}
                  onSelectionChange={(category) =>
                    setEntryDraft({ ...entryDraft, category })
                  }
                  isDisabled={disabled}
                >
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} id={category}>
                      {category}
                    </SelectItem>
                  ))}
                </Select>
              </Col>
              <Col span={12} md={6}>
                <Select
                  aria-label="工作进度"
                  selectedKey={entryDraft.status}
                  onSelectionChange={(status) =>
                    setEntryDraft({
                      ...entryDraft,
                      status: status as DailyEntry["status"],
                    })
                  }
                  isDisabled={disabled}
                >
                  {statusOptions.map(([value, label]) => (
                    <SelectItem key={value} id={value}>
                      {label}
                    </SelectItem>
                  ))}
                </Select>
              </Col>
              <Col span={12}>
                <Select
                  aria-label="关联项目"
                  selectedKey={entryDraft.projectId ?? "NONE"}
                  onSelectionChange={(projectId) =>
                    setEntryDraft({
                      ...entryDraft,
                      projectId: projectId === "NONE" ? null : projectId,
                    })
                  }
                  isDisabled={disabled}
                >
                  <SelectItem id="NONE">未关联项目</SelectItem>
                  {projects.map((item) => (
                    <SelectItem key={item.id} id={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </Select>
              </Col>
            </Row>
            {entryModal.kind === "work" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">交付物</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    disabled={disabled || entryDraft.deliverables.length >= 20}
                    onClick={() =>
                      setEntryDraft({
                        ...entryDraft,
                        deliverables: [...entryDraft.deliverables, ""],
                      })
                    }
                    className="text-blue-600"
                  >
                    <Plus className="size-3.5" aria-hidden />
                    添加交付物
                  </Button>
                </div>
                {entryDraft.deliverables.map(
                  (deliverable, deliverableIndex) => (
                    <div
                      key={deliverableIndex}
                      className="flex items-center gap-2"
                    >
                      <Input
                        aria-label={`交付物 ${deliverableIndex + 1}`}
                        value={deliverable}
                        onChange={(value) =>
                          setEntryDraft({
                            ...entryDraft,
                            deliverables: entryDraft.deliverables.map(
                              (item, itemIndex) =>
                                itemIndex === deliverableIndex ? value : item,
                            ),
                          })
                        }
                        placeholder="如：教材 1 本、章节 13 章"
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
                          setEntryDraft({
                            ...entryDraft,
                            deliverables: entryDraft.deliverables.filter(
                              (_, itemIndex) => itemIndex !== deliverableIndex,
                            ),
                          })
                        }
                        aria-label={`删除交付物 ${deliverableIndex + 1}`}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  ),
                )}
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {!preview ? (
        <FooterToolbar
          className={`fixed inset-x-0 bottom-0 z-40 mx-0 rounded-none border-x-0 px-0 py-0 sm:mx-0 sm:rounded-none ${sidebarState === "collapsed" ? "md:left-[var(--sidebar-width-icon)]" : "md:left-[var(--sidebar-width)]"}`}
        >
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 xl:px-8">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                今日计划 {plans.length} 项 · 已完成 {completedWorks} 项 · 达成率{" "}
                {fulfillment}%
              </p>
              {state.message ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="mt-0.5 truncate text-xs text-muted-foreground"
                >
                  {state.message}
                </p>
              ) : null}
            </div>
            {state.submitted ? (
              state.id ? (
                <ButtonLink href={`/reports/${state.id}`} variant="secondary">
                  查看已提交日报
                </ButtonLink>
              ) : null
            ) : (
              <div className="flex shrink-0 gap-2">
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={state.pending || submitting}
                >
                  {state.pending ? "正在保存" : "保存草稿"}
                </Button>
                <Button
                  type="button"
                  disabled={state.pending || submitting}
                  onClick={() => setPreview(true)}
                >
                  预览并提交
                </Button>
              </div>
            )}
          </div>
        </FooterToolbar>
      ) : null}
    </form>
  );
}

function PreviewEntries({
  title,
  entries,
}: {
  title: string;
  entries: DailyEntry[];
}) {
  return (
    <section className="min-w-0">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {entries.length ? (
        <ol className="mt-1.5 space-y-1.5 text-sm text-foreground">
          {entries.map((entry, index) => (
            <li key={index} className="min-w-0 truncate">
              {index + 1}. {entry.content}（{statusLabel[entry.status]}
              ）｜类型：{entry.category}
              {entry.deliverables.length
                ? `｜产出：${entry.deliverables.join(" ")}`
                : ""}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">暂无条目</p>
      )}
    </section>
  );
}
