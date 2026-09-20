"use client";

import { useRef, useState, type ComponentType } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FileText,
  Gauge,
  ListChecks,
  Plus,
  ChevronDown,
  LoaderCircle,
} from "lucide-react";
import { Badge } from "@/components/premium/badge";
import { Button, ButtonLink } from "@/components/motion/button/base";
import { Card, CardBody, CardHeader } from "@/components/premium/cards/card";
import { Input, Select, SelectItem, Textarea } from "@/components/premium/forms";
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
  AnimatedDropdownItemIcon,
  AnimatedDropdownItemText,
  AnimatedDropdownTrigger,
} from "@/components/premium/animated-dropdown";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/premium/data-table";
import type { WorkStatus } from "./task-item-row";
import { employeeDailyMetrics, type EmployeeDailyMetrics } from "@/lib/employee-metrics";

type TaskDeliverable = {
  unitName: string;
  quantity: string;
};

type EmployeeTask = {
  id: string;
  version: number;
  content: string;
  kind: "ACTUAL" | "PLAN";
  status: WorkStatus;
  projectName: string;
  categoryName: string;
  workDate: string | null;
  dueDate: string | null;
  sourceTaskId: string | null;
  deliverables: TaskDeliverable[];
};

type RecentReport = {
  id: string;
  type: "DAILY" | "WEEKLY";
  date: string | null;
  weekStart: string | null;
  summary: string | null;
  deliverableSummary: string;
  status: "DRAFT" | "SUBMITTED";
};

type CompletePlanResult = {
  id: string;
  version: number;
  workDate: string;
};

type SelectOption = { id: string; name: string };

const statusLabel: Record<WorkStatus, string> = {
  DONE: "已完成",
  IN_PROGRESS: "推进中",
  BLOCKED: "阻塞",
  TODO: "待开始",
  CANCELED: "已取消",
};

const reportColumns: DataTableColumn<RecentReport>[] = [
  {
    key: "report",
    header: "报告类型与日期",
    width: "14rem",
    cell: (report) => (
      <div className="flex min-w-0 items-center gap-2.5">
        <Badge
          variant="caption"
          color={report.type === "DAILY" ? "blue" : "purple"}
          className="rounded-full"
        >
          {report.type === "DAILY" ? "日报" : "周报"}
        </Badge>
        <time className="truncate font-mono font-semibold text-foreground tabular-nums">
          {report.date ?? report.weekStart ?? "未设置日期"}
        </time>
      </div>
    ),
  },
  {
    key: "summary",
    header: "工作内容摘要",
    width: "24rem",
    cell: (report) => (
      <p className="truncate text-foreground">
        {report.summary || "未填写工作总结"}
      </p>
    ),
  },
  {
    key: "deliverables",
    header: "交付物统计",
    width: "12rem",
    cell: (report) => (
      <span className="truncate text-foreground">
        {report.deliverableSummary}
      </span>
    ),
  },
  {
    key: "status",
    header: "状态",
    width: "8rem",
    cell: (report) => (
      <Badge
        variant="caption"
        color={report.status === "SUBMITTED" ? "lime" : "yellow"}
        className="rounded-full"
      >
        {report.status === "SUBMITTED" ? "已提交" : "草稿"}
      </Badge>
    ),
  },
  {
    key: "actions",
    header: "操作",
    width: "6rem",
    cell: (report) => (
      <ButtonLink
        href={`/reports/${report.id}`}
        variant="ghost"
        size="sm"
        className="gap-1 rounded-lg px-2"
        aria-label={`查看${report.type === "DAILY" ? "日报" : "周报"} ${report.date ?? report.weekStart ?? ""}`}
      >
        查看
        <ArrowRight className="size-3.5" aria-hidden />
      </ButtonLink>
    ),
  },
];

export function EmployeeDashboard({
  name,
  today,
  tasks,
  submitted,
  openBlockers,
  recentReports,
  projects,
  categories,
  deliverableUnits,
  dailyMetrics,
}: {
  name: string;
  today: string;
  tasks: EmployeeTask[];
  submitted: boolean;
  openBlockers: number;
  recentReports: RecentReport[];
  projects: SelectOption[];
  categories: SelectOption[];
  deliverableUnits: SelectOption[];
  dailyMetrics: EmployeeDailyMetrics;
}) {
  const busy = useRef(false);
  const [items, setItems] = useState(tasks);
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickContent, setQuickContent] = useState("");
  const [quickProjectId, setQuickProjectId] = useState(projects[0]?.id ?? "");
  const [quickCategoryId, setQuickCategoryId] = useState(categories[0]?.id ?? "");
  const [quickUnitId, setQuickUnitId] = useState(deliverableUnits[0]?.id ?? "");
  const [quickQuantity, setQuickQuantity] = useState("");
  const [quickPending, setQuickPending] = useState(false);
  const [quickError, setQuickError] = useState("");
  const plans = items.filter((task) => task.kind === "PLAN");
  const actuals = items.filter((task) => task.kind === "ACTUAL");
  const metrics = items.length ? employeeDailyMetrics(items) : dailyMetrics;
  const completed = metrics.completedCount;
  const planDone = metrics.completedPlans;
  const fulfillment = metrics.fulfillmentRate;
  const visibleReports = recentReports.slice(0, 5);

  async function completePlan(task: EmployeeTask) {
    if (busy.current || task.status === "DONE" || task.status === "CANCELED")
      return;
    busy.current = true;
    setPendingId(task.id);
    setError("");
    try {
      const response = await fetch("/api/tasks/complete-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: task.id, version: task.version }),
      });
      const result = (await response.json()) as CompletePlanResult & {
        error?: string;
      };
      if (!response.ok) {
        setError(result.error ?? "计划核销失败，请稍后重试");
        return;
      }
      setItems((current) => {
        const updated = current.map((item) =>
          item.id === task.id
            ? { ...item, status: "DONE" as const, version: item.version + 1 }
            : item,
        );
        if (updated.some((item) => item.id === result.id)) return updated;
        return [
          ...updated,
          {
            ...task,
            id: result.id,
            version: result.version,
            kind: "ACTUAL",
            status: "DONE",
            workDate: result.workDate,
            dueDate: null,
            sourceTaskId: task.id,
          },
        ];
      });
    } catch {
      setError("未能确认核销结果，请刷新页面后重试");
    } finally {
      busy.current = false;
      setPendingId("");
    }
  }

  async function updateStatus(task: EmployeeTask, status: WorkStatus) {
    if (pendingId || task.status === status || status === "DONE") return;
    setPendingId(task.id);
    setStatusError("");
    setItems((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
    try {
      const response = await fetch("/api/tasks/status", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: task.id, version: task.version, status }),
      });
      const result = (await response.json()) as { error?: string; version?: number; status?: WorkStatus };
      if (!response.ok) throw new Error(result.error ?? "任务状态更新失败");
      setItems((current) => current.map((item) => item.id === task.id ? { ...item, version: result.version ?? item.version + 1, status: result.status ?? status } : item));
    } catch (caught) {
      setItems((current) => current.map((item) => item.id === task.id ? { ...item, status: task.status } : item));
      setStatusError(caught instanceof Error ? caught.message : "任务状态更新失败，请稍后重试");
    } finally {
      setPendingId("");
    }
  }

  async function createQuickTask() {
    if (quickPending) return;
    setQuickPending(true);
    setQuickError("");
    const selectedProject = projects.find((item) => item.id === quickProjectId);
    const selectedCategory = categories.find((item) => item.id === quickCategoryId);
    const selectedUnit = deliverableUnits.find((item) => item.id === quickUnitId);
    const quantity = quickQuantity.trim() ? Number(quickQuantity) : null;
    const hasValidQuantity = quantity !== null && Number.isFinite(quantity) && quantity >= 0;
    if (!quickContent.trim() || !quickProjectId || !quickCategoryId || (quickQuantity.trim() && !hasValidQuantity)) {
      setQuickError("请填写任务、项目、分类，并确认产出数量有效");
      setQuickPending(false);
      return;
    }
    try {
      const response = await fetch("/api/tasks/quick-create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: quickProjectId,
          categoryId: quickCategoryId,
          content: quickContent.trim(),
          deliverables: quickQuantity.trim() && selectedUnit ? [{ unitId: selectedUnit.id, quantity }] : [],
        }),
      });
      const result = (await response.json()) as { error?: string; id?: string; version?: number; workDate?: string };
      if (!response.ok || !result.id) throw new Error(result.error ?? "临时任务创建失败");
      setItems((current) => [...current, {
        id: result.id!, version: result.version ?? 1, content: quickContent.trim(), kind: "ACTUAL", status: "DONE",
        projectName: selectedProject?.name ?? "未关联项目", categoryName: selectedCategory?.name ?? "未分类",
        workDate: result.workDate ?? null, dueDate: null, sourceTaskId: null,
        deliverables: quickQuantity.trim() && selectedUnit ? [{ unitName: selectedUnit.name, quantity: String(quantity) }] : [],
      }]);
      setQuickContent("");
      setQuickQuantity("");
      setQuickOpen(false);
    } catch (caught) {
      setQuickError(caught instanceof Error ? caught.message : "临时任务创建失败，请稍后重试");
    } finally {
      setQuickPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-primary text-xs uppercase tracking-[0.08em]">
            {today} · 我的工作
          </p>
          <h1 className="mt-1.5 text-2xl font-bold text-foreground">
            你好，{name}
          </h1>
          <p className="mt-1 text-sm text-foreground/75">
            查看计划、核销结果和需要协调的卡点。
          </p>
        </div>
        <ButtonLink
          href="/daily"
          variant={submitted ? "secondary" : "primary"}
          size="md"
          className="gap-2 rounded-lg"
        >
          <ClipboardCheck className="size-4" aria-hidden />
          {submitted ? "查看今日日报" : "填写今日日报"}
        </ButtonLink>
      </header>

      <section
        aria-label="今日指标概览"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        <MetricStat
          icon={CalendarDays}
          label="今日计划数"
          value={plans.length}
          suffix="项"
          iconClassName="bg-blue-50 text-blue-600"
        />
        <MetricStat
          icon={CheckCircle2}
          label="今日已完成"
          value={completed}
          suffix="项"
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <MetricStat
          icon={Gauge}
          label="今日达成率"
          value={fulfillment}
          suffix="%"
          iconClassName="bg-indigo-50 text-indigo-600"
          progress={fulfillment}
        />
        <MetricStat
          icon={CircleAlert}
          label="待协调卡点"
          value={openBlockers}
          suffix="项"
          danger={openBlockers > 0}
          href={openBlockers > 0 ? "/blockers" : undefined}
        />
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <ListChecks className="size-4" aria-hidden />
              </span>
              <h2 className="text-base font-semibold text-foreground">
                今日工作规划与核销
              </h2>
            </div>
            <p className="mt-1.5 pl-10 text-sm text-foreground/70">
              {plans.length
                ? `${planDone}/${plans.length} 项计划已核销，达成率 ${fulfillment}%`
                : "添加今日计划后，可直接核销为实际完成项"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <ButtonLink
              href="#quick-task"
              variant="secondary"
              size="sm"
              className="gap-1.5 rounded-lg"
              onClick={(event) => { event.preventDefault(); setQuickOpen((value) => !value); }}
            >
              <Plus className="size-4" aria-hidden />
              添加临时插队任务
            </ButtonLink>
            <ButtonLink
              href="/daily"
              variant="primary"
              size="sm"
              className="gap-1.5 rounded-lg"
            >
              <ClipboardCheck className="size-4" aria-hidden />
              {submitted ? "查看今日总结" : "提交今日总结"}
            </ButtonLink>
          </div>
        </CardHeader>

        {quickOpen && (
          <div id="quick-task" className="border-border/80 border-b bg-muted/25 px-5 py-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_150px_auto] lg:items-end">
              <Textarea label="临时任务" value={quickContent} onChange={setQuickContent} rows={2} isRequired />
              <Select aria-label="项目" selectedKey={quickProjectId} onSelectionChange={setQuickProjectId} placeholder="选择项目">
                {projects.map((item) => <SelectItem key={item.id} id={item.id}>{item.name}</SelectItem>)}
              </Select>
              <Select aria-label="分类" selectedKey={quickCategoryId} onSelectionChange={setQuickCategoryId} placeholder="选择分类">
                {categories.map((item) => <SelectItem key={item.id} id={item.id}>{item.name}</SelectItem>)}
              </Select>
              <div className="grid grid-cols-[1fr_1fr] gap-2">
                <Select aria-label="单位" selectedKey={quickUnitId} onSelectionChange={setQuickUnitId} placeholder="单位">
                  {deliverableUnits.map((item) => <SelectItem key={item.id} id={item.id}>{item.name}</SelectItem>)}
                </Select>
                <Input aria-label="数量" value={quickQuantity} onChange={setQuickQuantity} placeholder="数量" inputMode="decimal" size="small" />
              </div>
              <Button variant="primary" size="sm" disabled={quickPending} onClick={createQuickTask} className="gap-1.5 rounded-lg">
                {quickPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
                保存任务
              </Button>
            </div>
            {quickError && <p className="mt-2 text-status-rose-text text-xs" role="alert">{quickError}</p>}
          </div>
        )}

        {openBlockers > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-status-rose-text/25 border-b bg-status-rose-background px-5 py-2.5 text-status-rose-text">
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <CircleAlert className="size-4 shrink-0" aria-hidden />
              <span>{openBlockers} 项卡点正在等待协调，请及时跟进。</span>
            </div>
            <ButtonLink
              href="/blockers"
              variant="ghost"
              size="sm"
              className="gap-1 rounded-lg px-2 text-status-rose-text"
            >
              查看卡点
              <ArrowRight className="size-3.5" aria-hidden />
            </ButtonLink>
          </div>
        )}

        <CardBody className="grid min-w-0 p-0 lg:grid-cols-2">
          <div className="min-w-0 border-border/80 border-b lg:border-r lg:border-b-0">
            <WorkColumnHeader
              icon={CalendarDays}
              title="今日待办计划"
              detail={`${plans.length} 项`}
            />
            <div className="px-5 pb-5">
              {plans.length ? (
                <ul className="divide-y divide-border/70">
                  {plans.slice(0, 8).map((task) => {
                    const hasActual = actuals.some(
                      (actual) => actual.sourceTaskId === task.id,
                    );
                    const isComplete = task.status === "DONE" || hasActual;
                    return (
                      <li key={task.id} className="py-3.5">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <Badge
                                variant="caption"
                                color="blue"
                                className="max-w-32 shrink-0 truncate rounded-full"
                              >
                                {task.projectName}
                              </Badge>
                              <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                                {task.content}
                              </p>
                            </div>
                            <p className="mt-1.5 truncate text-foreground/70 text-xs">
                              预估产出：{deliverableText(task.deliverables)}
                            </p>
                          </div>
                          {isComplete ? (
                            <Badge
                              variant="caption"
                              color="lime"
                              className="rounded-full"
                            >
                              已核销
                            </Badge>
                          ) : task.status === "CANCELED" ? (
                            <Badge
                              variant="caption"
                              color="neutral"
                              className="rounded-full"
                            >
                              已取消
                            </Badge>
                          ) : (
                            <div className="flex shrink-0 items-center gap-1.5">
                              <StatusMenu task={task} pending={pendingId === task.id} onSelect={(status) => updateStatus(task, status)} />
                              <Button
                                variant="secondary"
                                size="sm"
                                className="gap-1 rounded-lg px-2.5"
                                disabled={Boolean(pendingId)}
                                onClick={() => completePlan(task)}
                                aria-label={`核销完成：${task.content}`}
                              >
                                {pendingId === task.id ? "核销中" : "核销完成"}
                                <ArrowRight className="size-3.5" aria-hidden />
                              </Button>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <WorkEmptyState
                  title="今天还没有待办计划"
                  description="添加计划后，可在这里直接核销。"
                  href="/tasks"
                  action="添加计划"
                />
              )}
              {error && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg bg-status-rose-background px-3 py-2 text-status-rose-text text-xs"
                >
                  {error}
                </p>
              )}
              {statusError && <p role="alert" className="mt-2 rounded-lg bg-status-rose-background px-3 py-2 text-status-rose-text text-xs">{statusError}</p>}
            </div>
          </div>

          <div className="min-w-0">
            <WorkColumnHeader
              icon={CheckCircle2}
              title="今日实际完成"
              detail={`${completed}/${actuals.length} 项已完成`}
            />
            <div className="px-5 pb-5">
              {actuals.length ? (
                <ul className="divide-y divide-border/70">
                  {actuals.slice(0, 8).map((task, index) => (
                    <li
                      key={task.id}
                      className="grid min-w-0 grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 py-3.5"
                    >
                      <span className="font-semibold text-primary text-xs tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="flex min-w-0 items-center gap-2">
                        <Badge
                          variant="caption"
                          color="blue"
                          className="max-w-28 shrink-0 truncate rounded-full"
                        >
                          {task.projectName}
                        </Badge>
                        <span className="min-w-0 truncate text-sm text-foreground">
                          {task.content}
                        </span>
                      </div>
                      <Badge
                        variant="caption"
                        color="soft"
                        className="max-w-24 truncate rounded-full"
                      >
                        {task.categoryName}
                      </Badge>
                      <div className="col-[2/-1] flex min-w-0 items-center gap-2">
                        <span className="min-w-0 flex-1 truncate rounded-full bg-status-blue-background px-2.5 py-1 text-status-blue-text text-xs font-medium">
                          产出：{deliverableText(task.deliverables)}
                        </span>
                        <Badge
                          variant="caption"
                          color={statusColor(task.status)}
                          className="rounded-full"
                        >
                          {statusLabel[task.status]}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <WorkEmptyState
                  title="还没有实际完成项"
                  description="从左侧核销计划，或添加临时工作。"
                  href="#quick-task"
                  action="添加临时工作"
                  onAction={() => setQuickOpen(true)}
                />
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-4" aria-hidden />
              </span>
              <h2 className="text-base font-semibold text-foreground">
                最近报告
              </h2>
            </div>
            <p className="mt-1.5 pl-10 text-foreground/70 text-xs">
              最近的日报与周报记录
            </p>
          </div>
          <ButtonLink
            href="/reports"
            variant="ghost"
            size="sm"
            className="gap-1 rounded-lg px-2"
          >
            查看全部
            <ArrowRight className="size-3.5" aria-hidden />
          </ButtonLink>
        </CardHeader>
        <CardBody className="p-0">
          <div className="hidden md:block">
            <DataTable
              data={visibleReports}
              columns={reportColumns}
              getRowId={(report) => report.id}
              rowHeight={52}
              height={Math.max(104, visibleReports.length * 52 + 44)}
              emptyState="还没有报告记录"
              className="border-0"
            />
          </div>
          <div className="divide-y divide-border/70 md:hidden">
            {visibleReports.length ? (
              visibleReports.map((report) => (
                <article
                  key={report.id}
                  className="px-4 py-3.5 transition-colors hover:bg-muted/60"
                >
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Badge
                        variant="caption"
                        color={report.type === "DAILY" ? "blue" : "purple"}
                        className="rounded-full"
                      >
                        {report.type === "DAILY" ? "日报" : "周报"}
                      </Badge>
                      <time className="truncate font-mono font-semibold text-foreground text-xs tabular-nums">
                        {report.date ?? report.weekStart ?? "未设置日期"}
                      </time>
                    </div>
                    <Badge
                      variant="caption"
                      color={report.status === "SUBMITTED" ? "lime" : "yellow"}
                      className="rounded-full"
                    >
                      {report.status === "SUBMITTED" ? "已提交" : "草稿"}
                    </Badge>
                  </div>
                  <p className="mt-2 truncate text-sm text-foreground">
                    {report.summary || "未填写工作总结"}
                  </p>
                  <div className="mt-2 flex min-w-0 items-center justify-between gap-3">
                    <span className="truncate text-foreground/70 text-xs">
                      交付物：{report.deliverableSummary}
                    </span>
                    <ButtonLink
                      href={`/reports/${report.id}`}
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-1 rounded-lg px-2"
                    >
                      查看
                      <ArrowRight className="size-3.5" aria-hidden />
                    </ButtonLink>
                  </div>
                </article>
              ))
            ) : (
              <p className="px-4 py-10 text-center text-muted-foreground text-sm">
                还没有报告记录
              </p>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function MetricStat({
  icon: Icon,
  label,
  value,
  suffix,
  iconClassName = "bg-primary/10 text-primary",
  progress,
  danger = false,
  href,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: number;
  suffix: string;
  iconClassName?: string;
  progress?: number;
  danger?: boolean;
  href?: string;
}) {
  return (
    <Card
      className={
        danger
          ? "border-status-rose-text/30 bg-status-rose-background text-status-rose-text"
          : undefined
      }
    >
      <CardBody className="flex min-h-24 items-center justify-between gap-2 p-3 sm:gap-3 sm:p-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-lg ${danger ? "bg-card text-status-rose-text" : iconClassName}`}
          >
            <Icon className="size-4.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p
              className={`text-xs font-medium leading-4 ${danger ? "text-status-rose-text" : "text-foreground/70"}`}
            >
              {label}
            </p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold tabular-nums">{value}</span>
              <span className="text-xs font-medium">{suffix}</span>
            </p>
          </div>
        </div>
        {progress !== undefined ? (
          <ProgressCircle value={progress} />
        ) : href ? (
          <ButtonLink
            href={href}
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-lg text-status-rose-text"
            aria-label="处理待协调卡点"
            title="处理待协调卡点"
          >
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        ) : null}
      </CardBody>
    </Card>
  );
}

function ProgressCircle({ value }: { value: number }) {
  const bounded = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={`今日达成率 ${bounded}%`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={bounded}
      className="grid size-10 shrink-0 place-items-center rounded-full sm:size-12"
      style={{
        background: `conic-gradient(var(--color-accent-600) ${bounded * 3.6}deg, var(--color-background-tertiary-default) 0deg)`,
      }}
    >
      <span className="grid size-[30px] place-items-center rounded-full bg-card font-semibold text-[9px] text-foreground tabular-nums sm:size-9 sm:text-[10px]">
        {bounded}%
      </span>
    </div>
  );
}

function WorkColumnHeader({
  icon: Icon,
  title,
  detail,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden />
        <h3 className="truncate text-sm font-semibold text-foreground">
          {title}
        </h3>
      </div>
      <span className="shrink-0 text-foreground/65 text-xs">{detail}</span>
    </div>
  );
}

function WorkEmptyState({
  title,
  description,
  href,
  action,
  onAction,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-4 py-7 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
        <Check className="size-4" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-foreground/70 text-xs">{description}</p>
      <ButtonLink
        href={href}
        variant="ghost"
        size="sm"
        className="mt-2 gap-1 rounded-lg px-2"
        onClick={onAction ? (event) => { event.preventDefault(); onAction(); } : undefined}
      >
        <Plus className="size-3.5" aria-hidden />
        {action}
      </ButtonLink>
    </div>
  );
}

function StatusMenu({
  task,
  pending,
  onSelect,
}: {
  task: EmployeeTask;
  pending: boolean;
  onSelect: (status: WorkStatus) => void;
}) {
  const statuses: Array<{ value: WorkStatus; label: string }> = [
    { value: "TODO", label: "待开始" },
    { value: "IN_PROGRESS", label: "推进中" },
    { value: "BLOCKED", label: "阻塞" },
    { value: "CANCELED", label: "已取消" },
  ];
  return (
    <AnimatedDropdown>
      <AnimatedDropdownTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          className="gap-1 rounded-lg px-2 text-xs text-muted-foreground"
          aria-label={`更新任务状态，当前${statusLabel[task.status]}`}
        >
          {pending ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : statusLabel[task.status]}
          <ChevronDown className="size-3.5" aria-hidden />
        </Button>
      </AnimatedDropdownTrigger>
      <AnimatedDropdownContent align="end" aria-label="任务状态">
        {statuses.map((item) => (
          <AnimatedDropdownItem key={item.value} onSelect={() => onSelect(item.value)}>
            <AnimatedDropdownItemIcon><Check className={item.value === task.status ? "opacity-100" : "opacity-0"} /></AnimatedDropdownItemIcon>
            <AnimatedDropdownItemText>{item.label}</AnimatedDropdownItemText>
          </AnimatedDropdownItem>
        ))}
      </AnimatedDropdownContent>
    </AnimatedDropdown>
  );
}

function deliverableText(items: TaskDeliverable[]) {
  if (!items.length) return "未登记";
  return items
    .map((item) => `${formatQuantity(item.quantity)} ${item.unitName}`)
    .join("、");
}

function formatQuantity(value: string) {
  const quantity = Number(value);
  return Number.isFinite(quantity)
    ? quantity.toLocaleString("zh-CN", { maximumFractionDigits: 4 })
    : value;
}

function statusColor(status: WorkStatus) {
  return {
    DONE: "lime",
    IN_PROGRESS: "blue",
    BLOCKED: "rose",
    TODO: "yellow",
    CANCELED: "neutral",
  }[status] as "lime" | "blue" | "rose" | "yellow" | "neutral";
}

