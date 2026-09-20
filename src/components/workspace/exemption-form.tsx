"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DatePicker, Input } from "@/components/premium/forms";
import { Select, SelectItem } from "@/components/premium/forms";
import { Button } from "@/components/motion/button/base";
export function ExemptionForm({
  people,
}: {
  people: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [userId, setUserId] = useState(people[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    if (startDate > endDate) {
      setMessage("结束日期不能早于开始日期");
      return;
    }
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/exemptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, startDate, endDate, reason }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "登记失败");
        return;
      }
      setMessage("免报已登记");
      router.refresh();
    } catch {
      setMessage("未能确认结果，请核对记录后重试");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="flex max-w-2xl flex-col gap-4 rounded-xl border border-slate-200/80 p-6"
    >
      <h2 className="text-xl font-medium leading-7">登记免报</h2>
      {!people.length && <p>暂无可登记的有效成员</p>}
      <Select
        aria-label="免报成员"
        selectedKey={userId || null}
        onSelectionChange={(key) => setUserId(String(key))}
        isDisabled={pending || !people.length}
      >
        {people.map((person) => (
          <SelectItem key={person.id} id={person.id}>
            {person.name}
          </SelectItem>
        ))}
      </Select>
      <div className="grid gap-4 md:grid-cols-2">
        <DatePicker
          label="开始日期"
          value={startDate}
          onChange={setStartDate}
          isRequired
          isDisabled={pending}
        />
        <DatePicker
          label="结束日期"
          value={endDate}
          onChange={setEndDate}
          isRequired
          isDisabled={pending}
        />
      </div>
      <Input
        label="免报原因"
        value={reason}
        onChange={setReason}
        isRequired
        maxLength={500}
        isDisabled={pending}
      />
      <Button type="submit" disabled={pending || !userId}>
        {pending ? "正在登记…" : "登记免报"}
      </Button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
