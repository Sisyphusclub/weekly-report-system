"use client";
import { useState } from "react";
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
  async function mark(id: string) {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (response.ok)
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, readAt: new Date() } : item,
        ),
      );
  }
  return items.length ? (
    <ul className="divide-y divide-separator-border rounded-3xl border border-border-button-default">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-start justify-between gap-4 p-5"
        >
          <div>
            <p
              className={item.readAt ? "text-body-regular" : "text-body-medium"}
            >
              {item.title}
            </p>
            <time className="mt-2 block text-body-regular text-text-secondary">
              {item.createdAt.toLocaleString("zh-CN", {
                timeZone: "Asia/Shanghai",
              })}
            </time>
          </div>
          <div className="flex gap-3">
            {item.link && <a href={item.link}>打开</a>}
            {!item.readAt && (
              <button type="button" onClick={() => void mark(item.id)}>
                标为已读
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  ) : (
    <div className="rounded-3xl border border-border-button-default p-12 text-center">
      <p className="text-headline-medium">暂无通知</p>
    </div>
  );
}
