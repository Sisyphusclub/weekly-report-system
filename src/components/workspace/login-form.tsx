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
  const [code, setCode] = useState("");
  const [secondFactor, setSecondFactor] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !configured) return;
    setBusy(true);
    setError("");
    try {
      if (secondFactor) {
        const result = recovery
          ? await authClient.twoFactor.verifyBackupCode({
              code,
              trustDevice: false,
            })
          : await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
        if (result.error) {
          setError("验证码无效或已过期，请重新输入。连续失败后请稍后再试。");
          return;
        }
      } else {
        const result = await authClient.signIn.username({
          username: username.trim().toLowerCase(),
          password,
          rememberMe: false,
        });
        if (result.error) {
          setError(
            result.error.status === 429
              ? "登录尝试过于频繁，请 15 分钟后重试。"
              : result.error.status === 503
                ? "认证服务暂不可用，请联系管理员。"
                : "登录失败，请检查用户名和密码，或联系管理员。",
          );
          return;
        }
        setPassword("");
        if (
          result.data &&
          "twoFactorRedirect" in result.data &&
          result.data.twoFactorRedirect
        ) {
          setSecondFactor(true);
          return;
        }
      }
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
      {secondFactor ? (
        <Input
          label={recovery ? "一次性恢复码" : "身份验证器验证码"}
          value={code}
          onChange={setCode}
          autoComplete="one-time-code"
          isRequired
          isDisabled={busy}
          autoFocus
        />
      ) : (
        <>
          <Input
            label="用户名"
            name="username"
            value={username}
            onChange={setUsername}
            autoComplete="username"
            placeholder="请输入管理员分配的用户名"
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
      )}
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
        {busy ? "正在验证…" : secondFactor ? "验证并继续" : "登录工作台"}
      </Button>
      {secondFactor && (
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setRecovery(!recovery);
            setCode("");
            setError("");
          }}
        >
          {recovery ? "使用身份验证器" : "使用一次性恢复码"}
        </Button>
      )}
      <p className="text-caption-1-regular text-text-tertiary">
        账号由管理员统一管理。忘记密码或账号停用时，请联系管理员重置。
      </p>
    </form>
  );
}
