"use client";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/motion/button/base";
import { FileUploadButton } from "@/components/premium/forms";

type Attachment = {
  id: string;
  fileName: string;
  sizeBytes: number;
  url: string;
  sha256: string;
};
export function TaskAttachmentSection({ taskId }: { taskId: string }) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [message, setMessage] = useState("");
  const load = async () => {
    const response = await fetch(
      `/api/tasks/attachments?taskId=${encodeURIComponent(taskId)}`,
    );
    if (response.ok) setItems((await response.json()).items);
  };
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);
  const upload = async (file: File) => {
    setMessage("上传中...");
    const digest = await crypto.subtle.digest(
      "SHA-256",
      await file.arrayBuffer(),
    );
    const sha256 = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const checksum = btoa(String.fromCharCode(...new Uint8Array(digest)));
    const response = await fetch("/api/tasks/attachments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        taskId,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        sha256,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "上传失败");
      return;
    }
    const put = await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type, "x-amz-checksum-sha256": checksum },
      body: file,
    });
    if (!put.ok) {
      await fetch(`/api/tasks/attachments?id=${encodeURIComponent(data.id)}`, {
        method: "DELETE",
      });
    }
    if (put.ok)
      await fetch(`/api/tasks/attachments?id=${encodeURIComponent(data.id)}`, {
        method: "PATCH",
      });
    setMessage(put.ok ? "上传完成" : "文件上传失败");
    if (put.ok) await load();
  };
  const remove = async (id: string) => {
    const response = await fetch(
      `/api/tasks/attachments?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (response.ok) {
      setItems((current) => current.filter((item) => item.id !== id));
      setMessage("附件已删除");
    } else setMessage((await response.json()).error ?? "删除失败");
  };
  return (
    <details className="w-full">
      <summary className="cursor-pointer text-sm font-medium leading-5">
        附件{items.length ? `（${items.length}）` : ""}
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        <FileUploadButton
          accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
          label="上传附件"
          onFileChange={(file) => {
            if (file) void upload(file);
          }}
        />
        <span className="text-sm font-normal leading-5 text-slate-500">
          单个文件不超过 10 MB
        </span>
        {message && <span>{message}</span>}
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <ButtonLink
                variant="ghost"
                size="small"
                className="justify-start px-0 text-blue-600 underline hover:bg-transparent"
                href={item.url}
                target="_blank"
                rel="noreferrer"
              >
                {item.fileName}
              </ButtonLink>
              <Button
                type="button"
                variant="ghost"
                size="small"
                className="ml-2 px-0 text-slate-500 underline hover:bg-transparent"
                onClick={() => void remove(item.id)}
              >
                删除
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
