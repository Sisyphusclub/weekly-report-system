"use client";
import { useEffect, useState } from "react";

type Attachment = {
  id: string;
  fileName: string;
  sizeBytes: number;
  url: string;
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
    const response = await fetch("/api/tasks/attachments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        taskId,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "上传失败");
      return;
    }
    const put = await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type },
      body: file,
    });
    setMessage(put.ok ? "上传完成" : "文件上传失败");
    if (put.ok) await load();
  };
  return (
    <details className="w-full">
      <summary className="cursor-pointer text-body-medium">
        附件{items.length ? `（${items.length}）` : ""}
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.currentTarget.value = "";
          }}
        />
        <span className="text-body-regular text-text-secondary">
          单个文件不超过 10 MB
        </span>
        {message && <span>{message}</span>}
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <a
                className="text-blue-600 underline"
                href={item.url}
                target="_blank"
                rel="noreferrer"
              >
                {item.fileName}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
