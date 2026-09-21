"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FormStatus, Input, Textarea, type FormStatusTone } from "@/components/premium/forms";
import { Button } from "@/components/motion/button/base";

export function SettingsForm({
  name,
  version,
}: {
  name: string;
  version: number;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<FormStatusTone>("neutral");
  const [blocked, setBlocked] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(version);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || blocked) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    busy.current = true;
    setPending(true);
    setMessage("");
    setMessageTone("neutral");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, version: currentVersion }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "保存失败，请稍后重试");
        setMessageTone("error");
        if (response.status === 409 || response.status >= 500) setBlocked(true);
        return;
      }
      setCurrentVersion(result.version);
      setMessage("设置已保存");
      setMessageTone("success");
      router.refresh();
    } catch {
      setBlocked(true);
      setMessage("未能确认保存结果，请保留内容并刷新核对");
      setMessageTone("error");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={save}
      className="flex flex-col gap-4 rounded-xl border border-border p-6"
    >
      <h2 className="text-xl font-medium leading-7">组织信息</h2>
      <Input
        name="name"
        label="组织名称"
        defaultValue={name}
        maxLength={80}
        isRequired
        isDisabled={pending}
        isReadOnly={blocked}
      />
      <Textarea
        name="reason"
        label="修改原因"
        maxLength={500}
        isRequired
        isDisabled={pending}
        isReadOnly={blocked}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || blocked}>
          {pending ? "保存中…" : "保存设置"}
        </Button>
        {blocked && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.location.reload()}
          >
            刷新核对
          </Button>
        )}
      </div>
      {message && (
        <FormStatus tone={messageTone}>{message}</FormStatus>
      )}
    </form>
  );
}

