"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/motion/button/base";
import { Input } from "@/components/premium/forms";
import { authClient } from "@/lib/auth-client";

export function SecurityForm() {
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (password === newPassword) {
        setMessage("新密码必须与当前密码不同。");
        return;
      }
      const result = await authClient.changePassword({
        currentPassword: password,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        setMessage("修改失败，请检查当前密码和新密码长度。");
        return;
      }
      setPassword("");
      setNewPassword("");
      setMessage("密码已更新，其他设备会话已退出。");
    } catch {
      setMessage("安全设置服务暂不可用，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <h2 className="text-xl font-medium leading-7">修改密码</h2>
      <p className="text-sm font-normal leading-5 text-slate-500">
        新密码为 12–128 位，保存后其他设备会话将退出。
      </p>
      <Input
        label="当前密码"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        isRequired
        isDisabled={busy}
      />
      <Input
        label="新密码"
        type="password"
        value={newPassword}
        onChange={setNewPassword}
        minLength={12}
        maxLength={128}
        autoComplete="new-password"
        isRequired
        isDisabled={busy}
      />
      {message && (
        <p role="status" className="text-sm font-normal leading-5">
          {message}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "正在保存…" : "更新密码"}
      </Button>
    </form>
  );
}
