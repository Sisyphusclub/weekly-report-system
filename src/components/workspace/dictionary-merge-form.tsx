"use client";
import { useState } from "react";
import { Button } from "@/components/motion/button/base";
import { Select, SelectItem } from "@/components/premium/forms";
export function DictionaryMergeForm({
  kind,
  entries,
}: {
  kind: "category" | "unit";
  entries: Array<{ id: string; name: string }>;
}) {
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit() {
    setPending(true);
    setMessage("");
    const r = await fetch("/api/admin/dictionaries/merge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, sourceId, targetId }),
    });
    const d = await r.json();
    setMessage(
      r.ok
        ? `合并完成，可在 ${new Date(d.undoUntil).toLocaleTimeString()} 前撤销`
        : (d.error ?? "合并失败"),
    );
    setPending(false);
  }
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Select
        aria-label="待合并资料"
        selectedKey={sourceId || null}
        onSelectionChange={(k) => setSourceId(String(k))}
      >
        {entries.map((e) => (
          <SelectItem key={e.id} id={e.id}>
            {e.name}
          </SelectItem>
        ))}
      </Select>
      <Select
        aria-label="合并到资料"
        selectedKey={targetId || null}
        onSelectionChange={(k) => setTargetId(String(k))}
      >
        {entries.map((e) => (
          <SelectItem key={e.id} id={e.id}>
            {e.name}
          </SelectItem>
        ))}
      </Select>
      <Button
        variant="secondary"
        onClick={() => void submit()}
        disabled={pending || !sourceId || !targetId || sourceId === targetId}
      >
        合并
      </Button>
      {message && <span role="status">{message}</span>}
    </div>
  );
}
