"use client";

import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  StatefulButton,
  type ButtonState,
} from "@/components/motion/button/stateful";
import { Button } from "@/components/motion/button/base";
import { Input } from "@/components/premium/forms";
import { authClient } from "@/lib/auth-client";

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
      <Input
        name="username"
        label="用户名"
        value={username}
        onChange={(value) => {
          setUsername(value);
          resetFeedback();
        }}
        leadingIcon={UserRound}
        autoComplete="username"
        placeholder="输入用户名"
        isRequired
        isDisabled={!configured || busy}
      />

      <Input
        name="password"
        label="密码"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(value) => {
          setPassword(value);
          resetFeedback();
        }}
        leadingIcon={LockKeyhole}
        rightIcon={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            iconOnly
            leadingIcon={showPassword ? EyeOff : Eye}
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
            disabled={!configured || busy}
            onClick={() => setShowPassword((current) => !current)}
          />
        }
        autoComplete="current-password"
        placeholder="输入密码"
        isRequired
        isDisabled={!configured || busy}
      />

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
              <Button
                key={account.username}
                type="button"
                variant="outline"
                size="small"
                onClick={() => {
                  setUsername(account.username);
                  setPassword(account.password);
                  setButtonState("idle");
                  setError("");
                }}
              >
                {account.label}
              </Button>
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
