"use client";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/motion/button/base";
type Item = {
  id: string;
  title: string;
  type: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
};
export function NotificationList({ items: initial }: { items: Item[] }) {
  const [items, setItems] = useState(initial);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function mark(id: string) {
    if (pending) return;
    setPending(id);
    setError("");
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (response.ok && result.ok)
        setItems((current) =>
          current.map((item) =>
            item.id === id ? { ...item, readAt: new Date() } : item,
          ),
        );
      else setError(result.error ?? "标记失败，请刷新核对通知");
    } catch {
      setError("通知更新失败，请稍后重试");
    } finally {
      setPending(null);
    }
  }
  return items.length ? (
    <div>
      {error && <p role="alert">{error}</p>}
      <ul className="divide-y divide-separator-border rounded-xl border border-slate-200/80">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-start justify-between gap-4 p-5"
          >
            <div>
              <p
                className={
                  item.readAt ? "text-sm font-normal leading-5" : "text-sm font-medium leading-5"
                }
              >
                {item.title}
              </p>
              <time className="mt-2 block text-sm font-normal leading-5 text-slate-500">
                {item.createdAt.toLocaleString("zh-CN", {
                  timeZone: "Asia/Shanghai",
                })}
              </time>
            </div>
            <div className="flex gap-3">
              {item.link && (
                <ButtonLink href={item.link} variant="ghost">
                  打开
                </ButtonLink>
              )}
              {!item.readAt && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending !== null}
                  onClick={() => void mark(item.id)}
                >
                  {pending === item.id ? "正在更新…" : "标为已读"}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  ) : (
    <div className="rounded-xl border border-slate-200/80 p-12 text-center">
      <p className="text-base font-medium leading-6">暂无通知</p>
    </div>
  );
}

