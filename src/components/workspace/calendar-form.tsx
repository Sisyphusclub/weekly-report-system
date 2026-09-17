"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/base/input/input";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Button } from "@/components/base/buttons/button";

export function CalendarForm({
  date,
  version,
  initialWorkday,
  initialDescription,
}: {
  date: string;
  version: number;
  initialWorkday: boolean;
  initialDescription: string;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [isWorkday, setWorkday] = useState(initialWorkday);
  const [description, setDescription] = useState(initialDescription);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [currentVersion, setVersion] = useState(version);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/calendar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date,
          version: currentVersion,
          isWorkday,
          description,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "保存失败");
        return;
      }
      setVersion(result.version);
      setMessage("日历已更新");
      router.refresh();
    } catch {
      setMessage("未能确认保存结果，请刷新核对后再试");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={save}
      className="flex max-w-2xl flex-col gap-4 rounded-3xl border border-border-button-default p-6"
    >
      <h2 className="text-title-2-medium">{date}</h2>
      <Checkbox
        isSelected={isWorkday}
        onChange={setWorkday}
        isDisabled={pending}
      >
        工作日
      </Checkbox>
      <Input
        label="调整说明"
        value={description}
        onChange={setDescription}
        isRequired
        maxLength={200}
        isDisabled={pending}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "正在保存…" : "保存设置"}
      </Button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
