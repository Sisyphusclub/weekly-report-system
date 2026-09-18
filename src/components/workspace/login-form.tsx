"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { RiArrowRightLine, RiLockLine, RiUserLine } from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !configured) return;
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.username({
        username: username.trim().toLowerCase(),
        password,
        rememberMe: false,
      });
      if (result.error) {
        setError(
          result.error.status === 503
            ? "认证服务暂不可用，请联系管理员。"
            : "登录失败，请检查用户名和密码，或联系管理员。",
        );
        return;
      }
      setPassword("");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("无法连接服务。请检查网络后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5"
      aria-label="账号登录"
    >
      <>
        <Input
          label="用户名"
          name="username"
          value={username}
          onChange={setUsername}
          autoComplete="username"
          placeholder="输入用户名"
          leadingIcon={RiUserLine}
          isRequired
          isDisabled={!configured || busy}
        />
        <Input
          label="密码"
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          placeholder="请输入密码"
          leadingIcon={RiLockLine}
          isRequired
          isDisabled={!configured || busy}
        />
      </>
      {error && (
        <p role="alert" className="text-body-regular text-text-primary">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={!configured || busy}
        trailingIcon={RiArrowRightLine}
        className="h-11 w-full"
      >
        {busy ? "登录中…" : "登录"}
      </Button>
      <p className="text-caption-1-regular text-text-tertiary">
        账号由管理员统一管理。忘记密码请联系管理员。
      </p>
    </form>
  );
}
