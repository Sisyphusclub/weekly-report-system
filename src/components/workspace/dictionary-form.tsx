"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/base/input/input";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Button } from "@/components/base/buttons/button";
type Entry = {
  id: string;
  name: string;
  enabled: boolean;
  sortOrder: number;
  updatedAt: string;
};
export function DictionaryForm({
  kind,
  entry,
}: {
  kind: "category" | "unit";
  entry?: Entry;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(entry?.name ?? "");
  const [sort, setSort] = useState(String(entry?.sortOrder ?? 0));
  const [enabled, setEnabled] = useState(entry?.enabled ?? true);
  const [version, setVersion] = useState(entry?.updatedAt);
  const [message, setMessage] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/dictionaries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          id: entry?.id,
          expectedUpdatedAt: version,
          name,
          enabled,
          sortOrder: Number(sort),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error);
        return;
      }
      if (entry) setVersion(result.updatedAt);
      else {
        setName("");
        setSort("0");
        setEnabled(true);
      }
      setMessage("已保存");
      router.refresh();
    } catch {
      setMessage("未能确认保存结果，请保留内容并刷新核对后重试");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={save}
      className="flex flex-col gap-4 rounded-3xl border border-border-button-default p-6"
    >
      <h2 className="text-headline-medium">
        {entry
          ? entry.name
          : `新增${kind === "category" ? "分类" : "交付物单位"}`}
      </h2>
      <Input
        label="名称"
        value={name}
        onChange={setName}
        isRequired
        maxLength={80}
        isDisabled={pending}
      />
      <Input
        label="排序（0–10000，数字小的在前）"
        type="number"
        value={sort}
        onChange={setSort}
        isRequired
        isDisabled={pending}
      />
      <Checkbox isSelected={enabled} onChange={setEnabled} isDisabled={pending}>
        启用
      </Checkbox>
      <Button type="submit" disabled={pending}>
        {pending ? "正在保存…" : "保存"}
      </Button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
