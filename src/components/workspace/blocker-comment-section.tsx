"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/motion/button/base";
import { FormStatus, Textarea } from "@/components/premium/forms";
type Item = {
  id: string;
  body: string;
  authorName: string;
  authorId: string;
  createdAt: string;
  deletedAt: string | null;
  parentId: string | null;
};

const commentDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});
export function BlockerCommentSection({
  blockerId,
  actorId,
  readOnly = false,
}: {
  blockerId: string;
  actorId: string;
  readOnly?: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  async function load() {
    try {
      const r = await fetch(`/api/blockers/${blockerId}/comments`);
      const d = await r.json();
      if (r.ok) setItems(d.items);
      else setMessage(d.error ?? "评论加载失败");
    } catch {
      setMessage("评论暂时无法加载，请刷新后重试");
    }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockerId]);
  async function submit() {
    if (!body.trim() || pending) return;
    setPending(true);
    setMessage("");
    try {
      const r = await fetch(`/api/blockers/${blockerId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, parentId: replyTo }),
      });
      const d = await r.json();
      if (r.ok) {
        setBody("");
        setReplyTo(null);
        await load();
      } else setMessage(d.error ?? "评论发布失败");
    } catch {
      setMessage("评论暂时无法发布，请稍后重试");
    } finally {
      setPending(false);
    }
  }
  async function update(id: string) {
    setPending(true);
    try {
      const r = await fetch(`/api/blockers/${blockerId}/comments/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (r.ok) {
        setEditing(null);
        setBody("");
        await load();
      } else setMessage("评论更新失败");
    } catch {
      setMessage("评论暂时无法更新，请稍后重试");
    } finally {
      setPending(false);
    }
  }
  async function remove(id: string) {
    setPending(true);
    try {
      const r = await fetch(`/api/blockers/${blockerId}/comments/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deleted: true }),
      });
      if (r.ok) await load();
      else setMessage("评论删除失败");
    } catch {
      setMessage("评论暂时无法删除，请稍后重试");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
      <h2 className="text-xl font-medium leading-7">
        阻塞评论{items.length ? `（${items.length}）` : ""}
      </h2>
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="border-b border-border pb-2">
              <strong>{item.authorName}</strong>
              <span className="ml-2 text-sm font-normal leading-5 text-muted-foreground">
                {commentDateFormatter.format(new Date(item.createdAt))}
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
              {!readOnly &&
                !item.deletedAt &&
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
              {!readOnly && !item.deletedAt && !editing && (
                <Button variant="ghost" onClick={() => setReplyTo(item.id)}>
                  回复
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">暂无评论</p>
      )}
      {!readOnly ? (
        <>
          <Textarea
            label={replyTo ? "回复内容" : "评论内容"}
            value={editing ? "" : body}
            onChange={setBody}
            maxLength={5000}
            rows={3}
            isDisabled={pending || Boolean(editing)}
          />
          {replyTo ? (
            <Button variant="ghost" onClick={() => setReplyTo(null)}>
              取消回复
            </Button>
          ) : null}
          <Button
            onClick={() => void submit()}
            disabled={pending || !body.trim() || Boolean(editing)}
          >
            发布评论
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">评论仅供查看</p>
      )}
      {message && (
        <FormStatus tone="error" role="alert">
          {message}
        </FormStatus>
      )}
    </section>
  );
}
