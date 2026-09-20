"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectItem } from "@/components/premium/forms";
import { Button } from "@/components/motion/button/base";

export function TaskStatusForm({
  taskId,
  version,
  status,
}: {
  taskId: string;
  version: number;
  status: string;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [selected, setSelected] = useState(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/tasks/status", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId, version, status: selected }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "状态更新失败");
        return;
      }
      router.refresh();
    } catch {
      setError("未能确认结果，请刷新后核对任务状态");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-3">
      <Select
        aria-label="更新任务状态"
        selectedKey={selected}
        onSelectionChange={(key) => setSelected(String(key))}
        isDisabled={pending}
      >
        <SelectItem id="TODO">待开始</SelectItem>
        <SelectItem id="IN_PROGRESS">进行中</SelectItem>
        <SelectItem id="BLOCKED">阻塞</SelectItem>
        <SelectItem id="DONE">完成</SelectItem>
        <SelectItem id="CANCELED">已取消</SelectItem>
      </Select>
      <Button
        type="submit"
        variant="secondary"
        disabled={pending || selected === status}
      >
        {pending ? "正在保存…" : "更新状态"}
      </Button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

