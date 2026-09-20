"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DatePicker, Input } from "@/components/premium/forms";
import { Textarea } from "@/components/premium/forms";
import { Select, SelectItem } from "@/components/premium/forms";
import { Checkbox } from "@/components/premium/forms";
import { Button } from "@/components/motion/button/base";
type Project = {
  id: string;
  version: number;
  name: string;
  description: string | null;
  ownerId: string;
  status: string;
  startDate: string | null;
  targetEndDate: string | null;
  memberIds: string[];
};
const labels = {
  PLANNED: "计划中",
  ACTIVE: "进行中",
  ON_HOLD: "暂停",
  COMPLETED: "完成",
  ARCHIVED: "归档",
};
export function ProjectForm({
  item,
  people,
}: {
  item?: Project;
  people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [owner, setOwner] = useState(item?.ownerId ?? "");
  const [status, setStatus] = useState(item?.status ?? "PLANNED");
  const [members, setMembers] = useState(item?.memberIds ?? []);
  const [version, setVersion] = useState(item?.version ?? 0);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...fields,
          id: item?.id,
          version,
          ownerId: owner,
          memberIds: members,
          status,
          startDate: fields.startDate || null,
          targetEndDate: fields.targetEndDate || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error);
        return;
      }
      setVersion(result.version);
      setMessage("项目已保存");
      router.push(`/admin/projects?edit=${result.id}`);
      router.refresh();
    } catch {
      setMessage("未能确认保存结果，请保留内容并核对项目列表后重试");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={save}
      className="flex flex-col gap-4 rounded-xl border border-slate-200/80 p-6"
    >
      <h2 className="text-xl font-medium leading-7">
        {item ? "编辑项目" : "创建项目"}
      </h2>
      <Input
        name="name"
        label="项目名称"
        defaultValue={item?.name}
        isRequired
        maxLength={120}
        isDisabled={pending}
      />
      <Textarea
        name="description"
        label="项目说明"
        defaultValue={item?.description ?? ""}
        maxLength={5000}
        isDisabled={pending}
      />
      <Select
        aria-label="项目负责人"
        placeholder="选择负责人"
        selectedKey={owner || null}
        onSelectionChange={(key) => setOwner(String(key))}
        isDisabled={pending}
      >
        {people.map((person) => (
          <SelectItem key={person.id} id={person.id}>
            {person.name}
          </SelectItem>
        ))}
      </Select>
      <Select
        aria-label="项目状态"
        selectedKey={status}
        onSelectionChange={(key) => setStatus(String(key))}
        isDisabled={pending}
      >
        {Object.entries(labels).map(([id, label]) => (
          <SelectItem key={id} id={id}>
            {label}
          </SelectItem>
        ))}
      </Select>
      <DatePicker
        name="startDate"
        label="开始日期"
        defaultValue={item?.startDate ?? ""}
        isDisabled={pending}
      />
      <DatePicker
        name="targetEndDate"
        label="目标结束日期"
        defaultValue={item?.targetEndDate ?? ""}
        isDisabled={pending}
      />
      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-3 text-sm font-medium leading-5">
          参与成员（负责人自动加入）
        </legend>
        {people.map((person) => (
          <Checkbox
            key={person.id}
            isDisabled={pending}
            isSelected={members.includes(person.id)}
            onChange={(checked) =>
              setMembers((current) =>
                checked
                  ? [...current, person.id]
                  : current.filter((id) => id !== person.id),
              )
            }
          >
            {person.name}
          </Checkbox>
        ))}
      </fieldset>
      {!people.length && <p>请先创建并激活业务账号，再设置项目负责人。</p>}
      <Button type="submit" disabled={pending || !owner}>
        {pending ? "正在保存…" : "保存项目"}
      </Button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
