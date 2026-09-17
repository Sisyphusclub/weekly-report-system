"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { authClient } from "@/lib/auth-client";

export function SecurityForm({
  mustChangePassword,
  twoFactorEnabled,
  required,
}: {
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
  required: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<{
    secret: string;
    backupCodes: string[];
  } | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (mustChangePassword) {
        if (password === newPassword) {
          setMessage("新密码必须与临时密码不同。");
          return;
        }
        const result = await authClient.changePassword({
          currentPassword: password,
          newPassword,
          revokeOtherSessions: true,
        });
        if (result.error) {
          setMessage("修改失败。请检查当前密码，新密码至少 12 位。");
          return;
        }
        setPassword("");
        setNewPassword("");
        setMessage("密码已更新，其他设备会话已撤销。");
        router.refresh();
      } else if (setup) {
        if (!saved) {
          setMessage("请先离线保存恢复码。");
          return;
        }
        const result = await authClient.twoFactor.verifyTotp({
          code,
          trustDevice: false,
        });
        if (result.error) {
          setMessage("验证码无效或已过期，请检查验证器后重试。");
          return;
        }
        setSetup(null);
        setPassword("");
        setCode("");
        setMessage("两步验证已启用。");
        router.refresh();
      } else {
        const result = await authClient.twoFactor.enable({ password });
        if (result.error || !result.data || !("totpURI" in result.data)) {
          setMessage("无法开始绑定，请检查密码后重试。");
          return;
        }
        const secret = new URL(result.data.totpURI).searchParams.get("secret");
        if (!secret) throw new Error("Missing TOTP secret");
        setSetup({ secret, backupCodes: result.data.backupCodes });
        setPassword("");
      }
    } catch {
      setMessage("安全设置服务暂不可用，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }
  if (!mustChangePassword && twoFactorEnabled)
    return (
      <div className="flex flex-col gap-5">
        <p>密码与两步验证已就绪。</p>
        <ButtonLink href="/dashboard">进入工作台</ButtonLink>
      </div>
    );
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <h2 className="text-title-2-medium">
        {mustChangePassword ? "设置你的专属密码" : "绑定身份验证器"}
      </h2>
      <p className="text-body-regular text-text-secondary">
        {mustChangePassword
          ? "首次登录需替换临时密码。新密码至少 12 位。"
          : required
            ? "你的角色必须启用两步验证后才能进入工作台。"
            : "可以使用身份验证器提高账号安全性。"}
      </p>
      {setup ? (
        <>
          <p className="text-body-regular">
            在身份验证器中添加账号，选择基于时间的验证码并输入以下密钥：
          </p>
          <code className="break-all rounded-xl bg-background-secondary-default p-4">
            {setup.secret}
          </code>
          <h3 className="text-headline-medium">离线保存一次性恢复码</h3>
          <p className="text-body-regular text-text-secondary">
            每个恢复码只能使用一次。请保存到安全位置，不要发给其他人。
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-background-secondary-default p-4">
            {setup.backupCodes.map((value) => (
              <code key={value}>{value}</code>
            ))}
          </div>
          <Checkbox isSelected={saved} onChange={setSaved}>
            我已离线保存恢复码
          </Checkbox>
          <Input
            label="身份验证器中的 6 位验证码"
            value={code}
            onChange={setCode}
            autoComplete="one-time-code"
            isRequired
            isDisabled={busy}
          />
        </>
      ) : (
        <Input
          label={mustChangePassword ? "当前临时密码" : "当前密码"}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          isRequired
          isDisabled={busy}
        />
      )}
      {mustChangePassword && (
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
      )}
      {message && (
        <p role="status" className="text-body-regular">
          {message}
        </p>
      )}
      <Button type="submit" disabled={busy || Boolean(setup && !saved)}>
        {busy
          ? "正在处理…"
          : mustChangePassword
            ? "更新密码"
            : setup
              ? "验证并完成绑定"
              : "开始绑定"}
      </Button>
      {!required && !mustChangePassword && !setup && (
        <ButtonLink href="/dashboard" variant="secondary">
          暂不绑定，进入工作台
        </ButtonLink>
      )}
    </form>
  );
}
