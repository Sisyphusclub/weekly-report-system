"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/motion/button/base";
import { Textarea } from "@/components/premium/forms";

type Comment = {
  id: string;
  parentId: string | null;
  body: string;
  authorName: string;
  createdAt: string;
  authorId: string;
  deletedAt: string | null;
};

export function CommentSection({ reportId }: { reportId: string }) {
  const [items, setItems] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch(`/api/comments?reportId=${reportId}`);
    const data = await response.json();
    if (response.ok) setItems(data.items);
    else setError(data.error ?? "评论加载失败");
    setLoading(false);
  }
  useEffect(() => {
    // 评论列表与远端报告同步，加载结果需要落入本地状态。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);
  async function submit() {
    if (!body.trim()) return;
    setSaving(true);
    setError("");
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reportId, parentId: replyTo, body }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "评论发布失败");
    else {
      setBody("");
      setReplyTo(null);
      await load();
    }
    setSaving(false);
  }
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200/80 p-6">
      <h2 className="text-xl font-medium leading-7">评论</h2>
      {loading ? (
        <p className="text-slate-500">加载中...</p>
      ) : items.length ? (
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-b border-slate-200 pb-4 last:border-0"
            >
              <div className="flex items-center justify-between">
                <strong>{item.authorName}</strong>
                <time className="text-sm font-normal leading-5 text-slate-500">
                  {new Date(item.createdAt).toLocaleString("zh-CN")}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words">
                {item.body}
              </p>
              {!item.deletedAt && (
                <Button variant="ghost" onClick={() => setReplyTo(item.id)}>
                  回复
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-500">暂无评论</p>
      )}
      {replyTo && (
        <p className="text-sm font-normal leading-5 text-slate-500">
          正在回复评论{" "}
          <Button variant="ghost" onClick={() => setReplyTo(null)}>
            取消
          </Button>
        </p>
      )}
      <Textarea
        value={body}
        onChange={(value) => setBody(value)}
        placeholder="写下评论"
        rows={4}
        maxLength={5000}
      />
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      <Button onClick={submit} disabled={saving || !body.trim()}>
        {saving ? "发布中..." : "发布评论"}
      </Button>
    </section>
  );
}

