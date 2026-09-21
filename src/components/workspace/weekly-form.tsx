"use client";
import { useState } from "react";
import { FormStatus, Textarea, type FormStatusTone } from "@/components/premium/forms";
import { Button, ButtonLink } from "@/components/motion/button/base";
export function WeeklyForm({
  date,
  version,
  initialSummary,
  submitted: initialSubmitted,
  reportId: initialReportId,
}: {
  date: string;
  version: number;
  initialSummary: string;
  submitted: boolean;
  reportId?: string;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [reportId, setReportId] = useState(initialReportId);
  const [currentVersion, setVersion] = useState(version);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<FormStatusTone>("neutral");
  const [pending, setPending] = useState(false);
  async function save(submit: boolean) {
    if (pending || submitted) return;
    setPending(true);
    setMessage("");
    setMessageTone("neutral");
    try {
      const response = await fetch("/api/reports/weekly", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date,
          summary,
          submit,
          version: currentVersion,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "保存周报失败，请稍后重试");
        setMessageTone("error");
        return;
      }
      setVersion(result.version);
      setSubmitted(result.status === "SUBMITTED");
      setReportId(result.id);
      setMessage(submit ? "周报已提交" : "周报草稿已保存");
      setMessageTone("success");
    } catch {
      setMessage("未能确认保存结果，内容已保留，请刷新核对后重试");
      setMessageTone("error");
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(false);
      }}
      className="flex max-w-3xl flex-col gap-4 rounded-xl border border-border p-6"
    >
      <p className="text-base font-medium leading-6">
        {date} 周 · {submitted ? "已提交" : "草稿"}
      </p>
      <Textarea
        label="本周总结"
        value={summary}
        onChange={setSummary}
        maxLength={10000}
        isDisabled={pending || submitted}
      />
      <div className="flex gap-3">
        {!submitted && (
          <>
            <Button type="submit" disabled={pending}>
              保存草稿
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => void save(true)}
            >
              提交周报
            </Button>
          </>
        )}
        {reportId && submitted && (
          <ButtonLink
            href={`/reports/${reportId}`}
            variant="secondary"
            size="small"
          >
            查看已提交周报
          </ButtonLink>
        )}
      </div>
      {message && <FormStatus tone={messageTone}>{message}</FormStatus>}
    </form>
  );
}
