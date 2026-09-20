"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/motion/button/base";
import { Input } from "@/components/premium/forms";
export function ExternalLinkForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/tasks/links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId, title, url }),
      });
      const data = await response.json();
      if (!response.ok) setMessage(data.error ?? "链接保存失败");
      else {
        setTitle("");
        setUrl("");
        setMessage("链接已保存");
        router.refresh();
      }
    } catch {
      setMessage("链接保存失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
      <Input
        label="链接名称"
        value={title}
        onChange={setTitle}
        isDisabled={pending}
        isRequired
      />
      <Input
        label="外部链接"
        type="url"
        value={url}
        onChange={setUrl}
        isDisabled={pending}
        isRequired
      />
      <Button type="submit" disabled={pending || !title.trim() || !url.trim()}>
        {pending ? "保存中..." : "添加链接"}
      </Button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}

