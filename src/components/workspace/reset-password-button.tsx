"use client";
import { useState } from "react";
import { EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/motion/button/base";
export function ResetPasswordButton({
  id,
  username,
}: {
  id: string;
  username: string;
}) {
  const [credential, setCredential] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function reset() {
    if (pending || credential) return;
    if (!window.confirm(`确定重置 ${username} 的密码吗？现有会话将立即失效。`))
      return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error);
        return;
      }
      setCredential(result.temporaryPassword);
    } catch {
      setMessage("重置失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }
  return credential ? (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      临时密码：
      <code className="rounded bg-muted px-1.5 py-1">{credential}</code>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-lg"
        onClick={() => setCredential(null)}
      >
        <EyeOff className="size-3.5" aria-hidden />
        隐藏
      </Button>
    </span>
  ) : (
    <span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-lg"
        disabled={pending}
        onClick={reset}
      >
        <KeyRound className="size-3.5" aria-hidden />
        {pending ? "重置中…" : "重置密码"}
      </Button>
      {message && (
        <span role="status" className="text-xs text-destructive">
          {message}
        </span>
      )}
    </span>
  );
}
