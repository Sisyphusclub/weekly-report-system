"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { Textarea } from "@/components/base/textarea/textarea";

export function RevisionReviewForm({
  requestId,
  version,
  stale,
}: {
  requestId: string;
  version: number;
  stale: boolean;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  async function review(decision: "APPROVED" | "REJECTED") {
    if (busy.current || done || !reason.trim()) return;
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/reports/revisions/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId, version, decision, reason }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "审核失败，请重试");
        return;
      }
      setDone(true);
      setMessage(
        decision === "APPROVED" ? "已通过，报告已生成新版本" : "已拒绝申请",
      );
      router.refresh();
    } catch {
      setMessage("未能确认审核结果，请刷新核对后重试");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <div className="flex flex-col gap-3">
      {stale && (
        <p role="status">报告已有新版本，请拒绝此申请后重新发起修订。</p>
      )}
      <Textarea
        label="审核说明"
        value={reason}
        onChange={setReason}
        maxLength={500}
        isRequired
        isDisabled={pending || done}
      />
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={pending || done || stale || !reason.trim()}
          onClick={() => review("APPROVED")}
        >
          通过修订
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending || done || !reason.trim()}
          onClick={() => review("REJECTED")}
        >
          拒绝申请
        </Button>
      </div>
      {pending && <p role="status">正在保存审核结果…</p>}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
