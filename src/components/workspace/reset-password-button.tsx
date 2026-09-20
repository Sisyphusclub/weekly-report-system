"use client";
import { useState } from "react";
import { Check, KeyRound, X } from "lucide-react";
import { Input } from "@/components/premium/forms";
import { Button } from "@/components/motion/button/base";

export function ResetPasswordButton({
  id,
  username,
}: {
  id: string;
  username: string;
}) {
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function reset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error);
        return;
      }
      setPassword("");
      setEditing(false);
      setMessage(`${username} 的密码已更新，原会话已退出。`);
    } catch {
      setMessage("重置失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  if (editing)
    return (
      <form onSubmit={reset} className="flex min-w-64 flex-col gap-2">
        <Input
          aria-label={`${username} 的新密码`}
          placeholder="输入 12–128 位新密码"
          type="password"
          value={password}
          onChange={setPassword}
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          isRequired
          isDisabled={pending}
          size="small"
        />
        <span className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            <Check className="size-3.5" aria-hidden />
            {pending ? "保存中…" : "确认"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              setEditing(false);
              setPassword("");
              setMessage("");
            }}
          >
            <X className="size-3.5" aria-hidden />
            取消
          </Button>
        </span>
        {message && (
          <span role="status" className="text-xs text-destructive">
            {message}
          </span>
        )}
      </form>
    );

  return (
    <span className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-lg"
        onClick={() => {
          setEditing(true);
          setMessage("");
        }}
      >
        <KeyRound className="size-3.5" aria-hidden />
        重置密码
      </Button>
      {message && (
        <span role="status" className="text-xs text-destructive">
          {message}
        </span>
      )}
    </span>
  );
}

