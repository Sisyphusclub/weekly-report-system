"use client";

import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  StatefulButton,
  type ButtonState,
} from "@/components/motion/button/stateful";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type DemoAccount = {
  label: string;
  username: string;
  password: string;
};

export function LoginForm({
  configured,
  demoAccounts = [],
}: {
  configured: boolean;
  demoAccounts?: DemoAccount[];
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [buttonState, setButtonState] = useState<ButtonState>("idle");
  const [error, setError] = useState("");
  const busy = buttonState === "loading";

  function resetFeedback() {
    if (buttonState !== "idle") setButtonState("idle");
    if (error) setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !configured) return;
    setButtonState("loading");
    setError("");
    try {
      const result = await authClient.signIn.username({
        username: username.trim().toLowerCase(),
        password,
        rememberMe: false,
      });
      if (result.error) {
        setButtonState("error");
        setError(
          result.error.status === 503
            ? "认证服务暂不可用，请联系管理员。"
            : "用户名或密码不正确。",
        );
        return;
      }
      setButtonState("success");
      setPassword("");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setButtonState("error");
      setError("无法连接服务，请稍后重试。");
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5"
      aria-label="账号登录"
    >
      <Field
        label="用户名"
        icon={<UserRound className="size-4" aria-hidden />}
        disabled={!configured || busy}
      >
        <input
          name="username"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            resetFeedback();
          }}
          autoComplete="username"
          placeholder="输入用户名"
          required
          disabled={!configured || busy}
          className={inputClass}
        />
      </Field>

      <Field
        label="密码"
        icon={<LockKeyhole className="size-4" aria-hidden />}
        disabled={!configured || busy}
      >
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            resetFeedback();
          }}
          autoComplete="current-password"
          placeholder="输入密码"
          required
          disabled={!configured || busy}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          disabled={!configured || busy}
          aria-label={showPassword ? "隐藏密码" : "显示密码"}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {showPassword ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </button>
      </Field>

      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-sm text-destructive"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <StatefulButton
        type="submit"
        state={buttonState}
        disabled={!configured}
        size="lg"
        className="w-full rounded-xl"
        loadingText="正在登录"
        successText="登录成功"
        errorText="重新登录"
      >
        登录
      </StatefulButton>

      {demoAccounts.length > 0 ? (
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">演示账号</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {demoAccounts.map((account) => (
              <button
                key={account.username}
                type="button"
                onClick={() => {
                  setUsername(account.username);
                  setPassword(account.password);
                  setButtonState("idle");
                  setError("");
                }}
                className="min-h-9 rounded-lg border border-border px-3 text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-xs leading-5 text-muted-foreground">
        忘记密码请联系管理员。
      </p>
    </form>
  );
}

function Field({
  label,
  icon,
  disabled,
  children,
}: {
  label: string;
  icon: ReactNode;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span
        className={cn(
          "flex h-11 items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 text-muted-foreground transition-colors",
          "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20",
          disabled && "cursor-not-allowed bg-muted/50 opacity-70",
        )}
      >
        {icon}
        {children}
      </span>
    </label>
  );
}

const inputClass =
  "min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed";
