"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Input } from "@/components/base/input/input";
import { Textarea } from "@/components/base/textarea/textarea";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { DailyDraftController } from "@/lib/daily-draft-controller";
import { remoteDailyDraft, type RemoteDailyDraft } from "@/lib/daily-conflict";

export function DailyForm({
  date,
  draft,
  tasks,
  initialTaskIds,
}: {
  date: string;
  initialTaskIds: string[];
  draft: {
    id: string;
    summary: string | null;
    noWorkReason: string | null;
    noPlanReason: string | null;
    version: number;
    status: string;
  } | null;
  tasks: Array<{
    id: string;
    content: string;
    kind: "ACTUAL" | "PLAN";
    status: string;
  }>;
}) {
  const [remote, setRemote] = useState<RemoteDailyDraft | null>(null);
  const [controller] = useState(
    () =>
      new DailyDraftController(
        {
          content: {
            summary: draft?.summary ?? "",
            noWorkReason: draft?.noWorkReason ?? "",
            noPlanReason: draft?.noPlanReason ?? "",
            taskIds: initialTaskIds,
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
                reportDate: date,
                version,
                submit,
              }),
            });
          } catch {
            throw new Error(
              "网络异常，自动保存已暂停。请保留内容并核对报告后重试。",
            );
          }
          const result = await response.json();
          if (response.status === 409) {
            const conflict = remoteDailyDraft.safeParse(result.remote);
            if (conflict.success) setRemote(conflict.data);
          }
          if (!response.ok)
            throw new Error(result.error ?? "保存失败，自动保存已暂停，请重试");
          return result;
        },
      ),
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.snapshot,
    controller.snapshot,
  );
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
  const selected = tasks.filter((task) =>
    state.content.taskIds.includes(task.id),
  );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void controller.save(false);
      }}
      className="flex max-w-2xl flex-col gap-5 rounded-3xl border border-border-button-default p-6"
    >
      <p className="text-headline-medium">
        {date} · {state.submitted ? "已提交" : "草稿"}
      </p>
      <Textarea
        label="工作总结"
        value={state.content.summary}
        onChange={(summary) => controller.update({ summary })}
        isDisabled={disabled}
        maxLength={10000}
      />
      {tasks.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-label-medium">
            关联任务（未完成计划已预选）
          </legend>
          {tasks.map((task) => (
            <Checkbox
              key={task.id}
              isSelected={state.content.taskIds.includes(task.id)}
              onChange={(checked) =>
                controller.update({
                  taskIds: checked
                    ? [...state.content.taskIds, task.id]
                    : state.content.taskIds.filter((id) => id !== task.id),
                })
              }
              isDisabled={disabled}
            >
              {task.content}（{task.kind === "PLAN" ? "计划" : "实际"}）
            </Checkbox>
          ))}
        </fieldset>
      )}
      <Input
        label="无实际任务时的原因"
        value={state.content.noWorkReason}
        onChange={(noWorkReason) => controller.update({ noWorkReason })}
        isDisabled={disabled}
        maxLength={200}
      />
      <Input
        label="无下一周期计划时的原因"
        value={state.content.noPlanReason}
        onChange={(noPlanReason) => controller.update({ noPlanReason })}
        isDisabled={disabled}
        maxLength={200}
      />
      {!state.submitted && (
        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="secondary" disabled={state.pending}>
            {state.pending ? "正在保存…" : "保存草稿"}
          </Button>
          <Button
            type="button"
            disabled={state.pending}
            onClick={() => setPreview(true)}
          >
            预览并提交
          </Button>
        </div>
      )}
      {preview && !state.submitted && (
        <section
          aria-label="提交预览"
          className="flex flex-col gap-4 rounded-2xl border border-border-button-default p-4"
        >
          <h2 className="text-title-2-medium">提交预览</h2>
          <p className="whitespace-pre-wrap break-words">
            {state.content.summary || "未填写总结"}
          </p>
          {(["ACTUAL", "PLAN"] as const).map((kind) => (
            <section key={kind}>
              <h3 className="text-body-medium">
                {kind === "ACTUAL" ? "实际工作" : "下一周期计划"}
              </h3>
              <ul className="mt-2 flex flex-col gap-2">
                {selected
                  .filter((task) => task.kind === kind)
                  .map((task) => (
                    <li
                      key={task.id}
                      className="whitespace-pre-wrap break-words"
                    >
                      {task.content}
                    </li>
                  ))}
              </ul>
              {!selected.some((task) => task.kind === kind) && (
                <p className="mt-2 text-text-secondary">
                  {(kind === "ACTUAL"
                    ? state.content.noWorkReason
                    : state.content.noPlanReason) || "未填写，请补充任务或原因"}
                </p>
              )}
            </section>
          ))}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={state.pending}
              onClick={async () => {
                setSubmitting(true);
                await controller.save(true);
                setSubmitting(false);
              }}
            >
              确认提交
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => setPreview(false)}
            >
              继续编辑
            </Button>
          </div>
        </section>
      )}
      {state.id && state.submitted && (
        <ButtonLink href={`/reports/${state.id}`} variant="secondary">
          查看报告
        </ButtonLink>
      )}
      {state.message && (
        <p role="status" aria-live="polite">
          {state.message}
        </p>
      )}
      {remote && (
        <section
          aria-label="版本冲突"
          className="flex flex-col gap-4 rounded-2xl border border-border-button-default p-4"
        >
          <h2 className="text-title-2-medium">远端已有更新</h2>
          <p>上方保留本地内容，可编辑合并后重新保存。</p>
          <div className="flex flex-col gap-2">
            <h3 className="text-body-medium">远端内容</h3>
            <p className="whitespace-pre-wrap break-words">
              {remote.summary || "未填写总结"}
            </p>
            <p>无工作原因：{remote.noWorkReason || "未填写"}</p>
            <p>无计划原因：{remote.noPlanReason || "未填写"}</p>
            <ul>
              {remote.taskIds.map((id) => (
                <li key={id}>
                  {tasks.find((task) => task.id === id)?.content ??
                    `任务 ${id}`}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-3">
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
                保存上方内容
              </Button>
            ) : (
              <ButtonLink href={`/reports/${remote.id}`} variant="secondary">
                查看已提交报告
              </ButtonLink>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob(
                    [
                      JSON.stringify(
                        { reportDate: date, ...state.content },
                        null,
                        2,
                      ),
                    ],
                    { type: "application/json" },
                  ),
                );
                const link = document.createElement("a");
                link.href = url;
                link.download = `日报草稿-${date}.json`;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              下载本地副本
            </Button>
          </div>
        </section>
      )}
    </form>
  );
}
