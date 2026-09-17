"use client";
import { useRef, useState } from "react";
import { Input } from "@/components/base/input/input";
import { Textarea } from "@/components/base/textarea/textarea";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";

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
  const [version, setVersion] = useState(draft?.version ?? 0);
  const [submitted, setSubmitted] = useState(draft?.status === "SUBMITTED");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(initialTaskIds);
  const [reportId, setReportId] = useState(draft?.id);
  const busy = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  async function save(submit: boolean) {
    if (busy.current || submitted || !formRef.current) return;
    busy.current = true;
    setPending(true);
    setMessage("");
    const data = Object.fromEntries(new FormData(formRef.current));
    try {
      const response = await fetch("/api/reports/daily", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...data,
          taskIds: selectedTaskIds,
          reportDate: date,
          submit,
          version,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "保存失败，请保留内容并重试");
        return;
      }
      setVersion(result.version);
      setReportId(result.id);
      setSubmitted(result.status === "SUBMITTED");
      setMessage(submit ? "日报已提交" : "草稿已保存");
    } catch {
      setMessage(
        "未能确认保存结果，输入内容已保留。请在另一页面核对报告后再试。",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        void save(false);
      }}
      className="flex max-w-2xl flex-col gap-5 rounded-3xl border border-border-button-default p-6"
    >
      <p className="text-headline-medium">
        {date} · {submitted ? "已提交" : "草稿"}
      </p>
      <Textarea
        name="summary"
        label="工作总结"
        defaultValue={draft?.summary ?? ""}
        isDisabled={pending || submitted}
        maxLength={10000}
      />
      {tasks.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-label-medium">关联任务</legend>
          {tasks.map((task) => (
            <Checkbox
              key={task.id}
              name="taskIds"
              value={task.id}
              isSelected={selectedTaskIds.includes(task.id)}
              onChange={(checked) =>
                setSelectedTaskIds((current) =>
                  checked
                    ? [...current, task.id]
                    : current.filter((id) => id !== task.id),
                )
              }
              isDisabled={pending || submitted}
            >
              {task.content} ({task.kind === "PLAN" ? "计划" : "实际"})
            </Checkbox>
          ))}
        </fieldset>
      )}
      <Input
        name="noWorkReason"
        label="无实际任务时的原因"
        defaultValue={draft?.noWorkReason ?? ""}
        isDisabled={pending || submitted}
        maxLength={200}
      />
      <Input
        name="noPlanReason"
        label="无下一周期计划时的原因"
        defaultValue={draft?.noPlanReason ?? ""}
        isDisabled={pending || submitted}
        maxLength={200}
      />
      {!submitted && (
        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            保存草稿
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => void save(true)}
          >
            提交日报
          </Button>
        </div>
      )}
      {reportId && submitted && (
        <ButtonLink href={`/reports/${reportId}`} variant="secondary">
          查看报告
        </ButtonLink>
      )}
      {message && <p role="status">{message}</p>}
    </form>
  );
}
