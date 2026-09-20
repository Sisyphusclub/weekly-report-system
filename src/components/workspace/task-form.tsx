"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { shanghaiDate } from "@/lib/daily-input";
import { Input } from "@/components/premium/forms";
import { Textarea } from "@/components/premium/forms";
import { Select, SelectItem } from "@/components/premium/forms";
import { Button } from "@/components/motion/button/base";
export function TaskForm({
  projects,
  categories,
  people,
  selfId,
  initial,
}: {
  projects: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  people: Array<{ id: string; name: string }>;
  selfId: string;
  initial?: {
    id: string;
    version: number;
    projectId: string;
    categoryId: string;
    primaryAssigneeId: string;
    content: string;
    kind: "ACTUAL" | "PLAN";
    status: string;
    workDate: string | null;
    dueDate: string | null;
    sourceTaskId: string | null;
  };
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(
    initial?.projectId ?? projects[0]?.id ?? "",
  );
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories[0]?.id ?? "",
  );
  const [primaryAssigneeId, setPrimaryAssigneeId] = useState(
    initial?.primaryAssigneeId ?? selfId,
  );
  const [kind, setKind] = useState(initial?.kind ?? "ACTUAL");
  const [status, setStatus] = useState(initial?.status ?? "TODO");
  const [content, setContent] = useState(initial?.content ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [workDate, setWorkDate] = useState(initial?.workDate ?? shanghaiDate());
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: initial?.id,
          version: initial?.version ?? 0,
          projectId,
          categoryId,
          primaryAssigneeId,
          content,
          kind,
          status,
          workDate: kind === "ACTUAL" ? workDate : null,
          dueDate: dueDate || null,
          sourceTaskId: null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "创建任务失败");
        return;
      }
      if (!initial) {
        setContent("");
        setDueDate("");
      }
      setMessage(initial ? "任务已更新" : "任务已创建");
      router.refresh();
    } catch {
      setMessage("创建失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl border border-slate-200/80 p-6"
    >
      <h2 className="text-xl font-medium leading-7">创建任务</h2>
      {(!projects.length || !categories.length) && (
        <p role="status">暂无可用项目或分类，请联系管理员配置后创建任务。</p>
      )}
      <Textarea
        label="任务内容"
        value={content}
        onChange={setContent}
        isRequired
        maxLength={5000}
        isDisabled={pending}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Select
          aria-label="项目"
          selectedKey={projectId}
          onSelectionChange={(key) => setProjectId(String(key))}
          isDisabled={pending}
        >
          {projects.map((item) => (
            <SelectItem key={item.id} id={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </Select>
        <Select
          aria-label="分类"
          selectedKey={categoryId}
          onSelectionChange={(key) => setCategoryId(String(key))}
          isDisabled={pending}
        >
          {categories.map((item) => (
            <SelectItem key={item.id} id={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </Select>
        <Select
          aria-label="任务类型"
          selectedKey={kind}
          onSelectionChange={(key) => setKind(String(key) as "ACTUAL" | "PLAN")}
          isDisabled={pending}
        >
          <SelectItem id="ACTUAL">实际工作</SelectItem>
          <SelectItem id="PLAN">计划</SelectItem>
        </Select>
        <Select
          aria-label="状态"
          selectedKey={status}
          onSelectionChange={(key) => setStatus(String(key))}
          isDisabled={pending}
        >
          <SelectItem id="TODO">待开始</SelectItem>
          <SelectItem id="IN_PROGRESS">进行中</SelectItem>
          <SelectItem id="BLOCKED">阻塞</SelectItem>
          <SelectItem id="DONE">完成</SelectItem>
          <SelectItem id="CANCELED">已取消</SelectItem>
        </Select>
        {people.length > 1 && (
          <Select
            aria-label="负责人"
            selectedKey={primaryAssigneeId}
            onSelectionChange={(key) => setPrimaryAssigneeId(String(key))}
            isDisabled={pending}
          >
            {people.map((item) => (
              <SelectItem key={item.id} id={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </Select>
        )}
        {kind === "ACTUAL" && (
          <Input
            label="工作日期"
            type="date"
            value={workDate}
            onChange={setWorkDate}
            isRequired
            isDisabled={pending}
          />
        )}
        <Input
          label="截止日期"
          isRequired={kind === "PLAN"}
          type="date"
          value={dueDate}
          onChange={setDueDate}
          isDisabled={pending}
        />
      </div>
      <Button type="submit" disabled={pending || !projectId || !categoryId}>
        {pending ? "正在创建" : "创建任务"}
      </Button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}

