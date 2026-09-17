"use client";
import { useState } from "react";
import { Button } from "@/components/base/buttons/button";
export function DictionaryMergeUndo({
  id,
  undoUntil,
}: {
  id: string;
  undoUntil: string;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function undo() {
    setPending(true);
    const r = await fetch(`/api/admin/dictionaries/merge?id=${id}`, {
      method: "DELETE",
    });
    const d = await r.json();
    setMessage(r.ok ? "已撤销，请刷新资料列表" : (d.error ?? "撤销失败"));
    setPending(false);
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Button variant="ghost" onClick={() => void undo()} disabled={pending}>
        撤销合并
      </Button>
      {message || `可撤销至 ${new Date(undoUntil).toLocaleTimeString()}`}
    </span>
  );
}
