"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { Textarea } from "@/components/base/textarea/textarea";
type Item = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
  deletedAt: string | null;
};
export function BlockerCommentSection({ blockerId }: { blockerId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function load() {
    const r = await fetch(`/api/blockers/${blockerId}/comments`);
    const d = await r.json();
    if (r.ok) setItems(d.items);
    else setMessage(d.error ?? "评论加载失败");
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockerId]);
  async function submit() {
    if (!body.trim() || pending) return;
    setPending(true);
    setMessage("");
    const r = await fetch(`/api/blockers/${blockerId}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const d = await r.json();
    if (r.ok) {
      setBody("");
      await load();
    } else setMessage(d.error ?? "评论发布失败");
    setPending(false);
  }
  return (
    <section className="mt-6 flex flex-col gap-3 rounded-3xl border border-border-button-default p-6">
      <h2 className="text-title-2-medium">
        阻塞评论{items.length ? `（${items.length}）` : ""}
      </h2>
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="border-b border-separator-border pb-2">
              <strong>{item.authorName}</strong>
              <span className="ml-2 text-body-regular text-text-secondary">
                {new Date(item.createdAt).toLocaleString("zh-CN")}
              </span>
              <p className="mt-1 whitespace-pre-wrap break-words">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-text-secondary">暂无评论</p>
      )}
      <Textarea
        label="评论内容"
        value={body}
        onChange={setBody}
        maxLength={5000}
        rows={3}
        isDisabled={pending}
      />
      <Button onClick={() => void submit()} disabled={pending || !body.trim()}>
        发布评论
      </Button>
      {message && <p role="alert">{message}</p>}
    </section>
  );
}
