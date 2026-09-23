"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/motion/button/base";
import { Input } from "@/components/premium/forms";
import { Select, SelectItem } from "@/components/premium/forms";

export function DeliverableForm({
  taskId,
  version,
  units,
  items,
}: {
  taskId: string;
  version: number;
  units: Array<{ id: string; name: string }>;
  items: Array<{ unitId: string; unitName: string; quantity: string }>;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [quantity, setQuantity] = useState(
    items.find((item) => item.unitId === units[0]?.id)?.quantity ?? "",
  );
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || saved) return;
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/tasks/deliverables", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          taskId,
          version,
          unitId,
          quantity: Number(quantity),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "交付物保存失败");
        return;
      }
      setSaved(true);
      setMessage("交付物已保存");
      router.refresh();
    } catch {
      setMessage("未能确认保存结果，请保留数量并刷新核对");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <details className="w-full">
      <summary className="cursor-pointer text-sm font-medium leading-5">
        交付物{items.length ? `（${items.length} 项）` : ""}
      </summary>
      <ul className="my-3 flex flex-wrap gap-3">
        {items.map((item) => (
          <li key={item.unitId}>
            {item.quantity} {item.unitName}
          </li>
        ))}
      </ul>
      {units.length ? (
        <form onSubmit={save} className="flex flex-col gap-3">
          <Select
            aria-label="交付物单位"
            selectedKey={unitId}
            onSelectionChange={(key) => {
              const selected = String(key);
              setUnitId(selected);
              setQuantity(
                items.find((item) => item.unitId === selected)?.quantity ?? "",
              );
            }}
            isDisabled={pending || saved}
          >
            {units.map((unit) => (
              <SelectItem id={unit.id} key={unit.id}>
                {unit.name}
              </SelectItem>
            ))}
          </Select>
          <Input
            label="交付物数量（该单位总量）"
            inputMode="decimal"
            value={quantity}
            onChange={setQuantity}
            isRequired
            isDisabled={pending || saved}
          />
          <Button
            type="submit"
            disabled={pending || saved || !unitId || !quantity.trim()}
          >
            {pending ? "正在保存…" : "保存交付物"}
          </Button>
          {message && <p role="status">{message}</p>}
        </form>
      ) : (
        <p className="text-slate-500">暂无可用交付物单位，请联系管理员配置。</p>
      )}
    </details>
  );
}
