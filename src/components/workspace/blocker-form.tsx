"use client";
import { useState } from "react";
import { Textarea } from "@/components/premium/forms";
import { Button } from "@/components/motion/button/base";
import { Select, SelectItem } from "@/components/premium/forms";
import { Checkbox } from "@/components/premium/forms";
import { useRouter } from "next/navigation";
export function BlockerForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [severity, setSeverity] = useState("NORMAL");
  const [sensitive, setSensitive] = useState(false);
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/blockers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description, severity, isSensitive: sensitive }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error);
        return;
      }
      setMessage("阻塞已提交，老板将收到站内通知");
      setDescription("");
      router.refresh();
    } catch {
      setMessage("未能确认保存结果，请保留内容并刷新列表核对后再试");
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className={`flex flex-col gap-4 ${compact ? "" : "rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs"}`}
    >
      <h2 className={compact ? "sr-only" : "text-xl font-medium leading-7"}>提交阻塞</h2>
      <Textarea
        label="阻塞描述"
        isRequired
        maxLength={5000}
        value={description}
        onChange={setDescription}
        isDisabled={pending}
      />
      <Select
        aria-label="严重程度"
        selectedKey={severity}
        onSelectionChange={(key) => setSeverity(String(key))}
        isDisabled={pending}
      >
        <SelectItem id="NORMAL">一般</SelectItem>
        <SelectItem id="IMPORTANT">重要</SelectItem>
        <SelectItem id="URGENT">紧急</SelectItem>
      </Select>
      <Checkbox
        isSelected={sensitive}
        onChange={setSensitive}
        isDisabled={pending}
      >
        包含敏感内容（仅本人、协调人和老板可见）
      </Checkbox>
      <Button type="submit" disabled={pending}>
        {pending ? "正在提交…" : "提交阻塞"}
      </Button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}

