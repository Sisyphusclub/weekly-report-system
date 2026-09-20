"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/premium/forms";
import { Textarea } from "@/components/premium/forms";
import { Button } from "@/components/motion/button/base";
export function RevisionForm({
  reportId,
  version,
  initialSummary,
}: {
  reportId: string;
  version: number;
  initialSummary: string;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [summary, setSummary] = useState(initialSummary);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || sent) return;
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/reports/revisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reportId, version, summary, reason }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "修订提交失败");
        return;
      }
      setSent(true);
      setMessage(
        result.status === "PENDING"
          ? "修订申请已提交，等待审核"
          : "修订已保存为新版本",
      );
      router.refresh();
    } catch {
      setMessage("未能确认提交结果，请保留内容并刷新核对");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <details className="rounded-3xl border border-border-button-default p-6">
      <summary className="cursor-pointer text-title-2-medium">修订总结</summary>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <Textarea
          label="修订后的总结"
          value={summary}
          onChange={setSummary}
          maxLength={10000}
          isDisabled={pending || sent}
        />
        <Input
          label="修订原因"
          value={reason}
          onChange={setReason}
          maxLength={500}
          isRequired
          isDisabled={pending || sent}
        />
        <Button
          type="submit"
          disabled={pending || sent || summary.trim() === initialSummary.trim()}
        >
          {pending ? "正在提交…" : "提交修订"}
        </Button>
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}

