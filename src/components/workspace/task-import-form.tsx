"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/motion/button/base";
import { Textarea } from "@/components/premium/forms";
const example =
  '{"items":[{"projectId":"项目编号","categoryId":"分类编号","primaryAssigneeId":"负责人编号","content":"任务内容","kind":"ACTUAL","status":"TODO","workDate":"2026-09-18","dueDate":null}]}';
export function TaskImportForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (file) {
      setPending(true);
      setMessage("");
      try {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/tasks/import", {
          method: "POST",
          body: form,
        });
        const data = await response.json();
        if (!response.ok) setMessage(data.error ?? "导入失败");
        else {
          setMessage(`已导入 ${data.created} 条任务`);
          setFile(null);
          router.refresh();
        }
      } catch {
        setMessage("导入失败，请稍后重试");
      } finally {
        setPending(false);
      }
      return;
    }
    let payload: unknown;
    try {
      payload = JSON.parse(value);
    } catch {
      setMessage("JSON 格式无效");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/tasks/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) setMessage(data.error ?? "导入失败");
      else {
        setMessage(`已导入 ${data.created} 条任务`);
        setValue("");
        router.refresh();
      }
    } catch {
      setMessage("导入失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }
  return (
    <details className="w-full">
      <summary className="cursor-pointer text-body-medium">
        导入任务 JSON
      </summary>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
        <Textarea
          label="任务数据"
          value={value}
          onChange={setValue}
          placeholder={example}
          rows={8}
          isDisabled={pending}
        />
        <input
          type="file"
          accept=".xlsx"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          disabled={pending}
        />
        <Button type="submit" disabled={pending || (!value.trim() && !file)}>
          {pending ? "导入中..." : "开始导入"}
        </Button>
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}

