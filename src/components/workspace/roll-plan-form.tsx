"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/premium/forms";
import { Button } from "@/components/motion/button/base";
import { useClientReady } from "@/lib/use-client-ready";

export function RollPlanForm({
  taskId,
  version,
  dueDate,
}: {
  taskId: string;
  version: number;
  dueDate: string;
}) {
  const router = useRouter();
  const ready = useClientReady();
  const busy = useRef(false);
  const [date, setDate] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    if (!date || date <= dueDate) {
      setMessage("新截止日期必须晚于原计划日期");
      return;
    }
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/tasks/roll", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId, version, dueDate: date }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "滚动失败，请稍后重试");
        return;
      }
      setMessage("后续计划已创建");
      router.refresh();
    } catch {
      setMessage("未能确认结果，请保留日期并重试");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="新截止日期"
          type="date"
          value={date}
          onChange={setDate}
          isRequired
          isDisabled={!ready || pending}
        />
        <Button type="submit" variant="secondary" disabled={pending || !date}>
          {pending ? "正在创建…" : "滚动计划"}
        </Button>
      </div>
      {message && <p role="status">{message}</p>}
    </form>
  );
}

