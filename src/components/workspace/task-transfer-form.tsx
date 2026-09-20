"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/motion/button/base";
import { Select, SelectItem } from "@/components/premium/forms";
import { Textarea } from "@/components/premium/forms";
import { Checkbox } from "@/components/premium/forms";

type Person = {
  id: string;
  name: string;
  username: string;
  status: string;
  role: string;
  openCount: number;
};
export function TaskTransferForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const busy = useRef(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [refreshRequired, setRefreshRequired] = useState(false);
  const count = Math.min(
    people.find((person) => person.id === from)?.openCount ?? 0,
    200,
  );
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      busy.current ||
      !confirmed ||
      !count ||
      !to ||
      from === to ||
      refreshRequired
    )
      return;
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/tasks/transfer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fromId: from,
          toId: to,
          expectedCount: count,
          reason,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "转交失败，请刷新后重试");
        setRefreshRequired(true);
      } else {
        setMessage(`已转交 ${result.transferred} 条任务`);
        setFrom("");
        setTo("");
        setReason("");
        router.refresh();
      }
    } catch {
      setMessage("未能确认转交结果，请刷新核对后再操作");
      setRefreshRequired(true);
    } finally {
      busy.current = false;
      setPending(false);
      setConfirmed(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl border border-slate-200/80 p-6"
    >
      <h2 className="text-xl font-medium leading-7">批量转交任务</h2>
      <p className="text-sm font-normal leading-5 text-slate-500">
        转交待开始、进行中和阻塞的任务，每批最多 200
        条。历史报告署名与快照保留。
      </p>
      {!people.some((person) => person.openCount > 0) ? (
        <p role="status">暂无待转交任务</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              aria-label="原负责人"
              placeholder="选择原负责人"
              selectedKey={from || null}
              isDisabled={pending || refreshRequired}
              onSelectionChange={(key) => {
                setFrom(String(key));
                setTo("");
                setConfirmed(false);
              }}
            >
              {people
                .filter((person) => person.openCount > 0)
                .map((person) => (
                  <SelectItem
                    key={person.id}
                    id={person.id}
                    textValue={`${person.name} ${person.username}`}
                  >
                    {person.name}（{person.username}）· {person.openCount} 条
                  </SelectItem>
                ))}
            </Select>
            <Select
              aria-label="接收人"
              placeholder="选择接收人"
              selectedKey={to || null}
              isDisabled={pending || refreshRequired}
              onSelectionChange={(key) => {
                setTo(String(key));
                setConfirmed(false);
              }}
            >
              {people
                .filter(
                  (person) =>
                    person.id !== from &&
                    person.status === "ACTIVE" &&
                    person.role !== "ADMIN",
                )
                .map((person) => (
                  <SelectItem
                    key={person.id}
                    id={person.id}
                    textValue={`${person.name} ${person.username}`}
                  >
                    {person.name}（{person.username}）
                  </SelectItem>
                ))}
            </Select>
          </div>
          {from &&
            !people.some(
              (person) =>
                person.id !== from &&
                person.status === "ACTIVE" &&
                person.role !== "ADMIN",
            ) && (
              <p
                role="status"
                className="text-sm font-normal leading-5 text-slate-500"
              >
                暂无可接收任务的成员，请先在账号管理中启用接收账号。
              </p>
            )}
          <Textarea
            label="转交原因"
            value={reason}
            onChange={setReason}
            maxLength={500}
            isRequired
            isDisabled={pending || refreshRequired}
          />
          <Checkbox
            isSelected={confirmed}
            onChange={setConfirmed}
            isDisabled={pending || refreshRequired || !count || !to}
          >
            确认转交本批 {count} 条任务
          </Checkbox>
          <Button
            type="submit"
            disabled={
              pending ||
              refreshRequired ||
              !confirmed ||
              !reason.trim() ||
              !count ||
              !to
            }
          >
            {pending ? "转交中…" : "转交任务"}
          </Button>
        </>
      )}
      {message && (
        <p role="status" className="text-sm font-normal leading-5 text-slate-500">
          {message}
        </p>
      )}
      {refreshRequired && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => window.location.reload()}
        >
          刷新并核对
        </Button>
      )}
    </form>
  );
}

