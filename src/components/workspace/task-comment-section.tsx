"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { Textarea } from "@/components/base/textarea/textarea";
type Item = {
  id: string;
  body: string;
  authorName: string;
  authorId: string;
  createdAt: string;
  deletedAt: string | null;
  parentId: string | null;
};
export function TaskCommentSection({
  taskId,
  actorId,
}: {
  taskId: string;
  actorId: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  async function load() {
    const r = await fetch(`/api/tasks/comments?taskId=${taskId}`);
    const d = await r.json();
    if (r.ok) setItems(d.items);
    else setMessage(d.error ?? "评论加载失败");
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);
  async function submit() {
    if (!body.trim() || pending) return;
    setPending(true);
    const r = await fetch("/api/tasks/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ taskId, body, parentId: replyTo }),
    });
    const d = await r.json();
    if (r.ok) {
      setBody("");
      setReplyTo(null);
      await load();
    } else setMessage(d.error ?? "评论发布失败");
    setPending(false);
  }
  async function update(id: string) {
    setPending(true);
    const r = await fetch(`/api/tasks/comments/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (r.ok) {
      setEditing(null);
      setBody("");
      await load();
    } else setMessage("评论更新失败");
    setPending(false);
  }
  async function remove(id: string) {
    setPending(true);
    const r = await fetch(`/api/tasks/comments/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deleted: true }),
    });
    if (r.ok) await load();
    else setMessage("评论删除失败");
    setPending(false);
  }
  return (
    <details className="w-full">
      <summary className="cursor-pointer text-body-medium">
        任务评论{items.length ? `（${items.length}）` : ""}
      </summary>
      {items.length ? (
        <ul className="my-3 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="border-b border-separator-border pb-2">
              <strong>{item.authorName}</strong>
              <span className="ml-2 text-body-regular text-text-secondary">
                {new Date(item.createdAt).toLocaleString("zh-CN")}
              </span>
              {editing === item.id ? (
                <Textarea
                  label="编辑评论"
                  value={body}
                  onChange={setBody}
                  rows={3}
                  isDisabled={pending}
                />
              ) : (
                <p className="mt-1 whitespace-pre-wrap break-words">
                  {item.body}
                </p>
              )}
              {!item.deletedAt &&
                item.authorId === actorId &&
                (editing === item.id ? (
                  <span className="flex gap-2">
                    <Button
                      onClick={() => void update(item.id)}
                      disabled={pending || !body.trim()}
                    >
                      保存
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditing(null);
                        setBody("");
                      }}
                    >
                      取消
                    </Button>
                  </span>
                ) : (
                  <span className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditing(item.id);
                        setBody(item.body);
                      }}
                    >
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => void remove(item.id)}
                      disabled={pending}
                    >
                      删除
                    </Button>
                  </span>
                ))}
              {!item.deletedAt && !editing && (
                <Button variant="ghost" onClick={() => setReplyTo(item.id)}>
                  回复
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="my-3 text-text-secondary">暂无评论</p>
      )}
      <Textarea
        label={replyTo ? "回复内容" : "评论内容"}
        value={editing ? "" : body}
        onChange={setBody}
        maxLength={5000}
        rows={3}
        isDisabled={pending || Boolean(editing)}
      />
      {replyTo && (
        <Button variant="ghost" onClick={() => setReplyTo(null)}>
          取消回复
        </Button>
      )}
      <Button
        className="mt-2"
        onClick={() => void submit()}
        disabled={pending || !body.trim() || Boolean(editing)}
      >
        发布评论
      </Button>
      {message && <p role="alert">{message}</p>}
    </details>
  );
}
