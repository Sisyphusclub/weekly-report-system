"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/base/input/input";
import { Textarea } from "@/components/base/textarea/textarea";
import { Select, SelectItem } from "@/components/base/select/select";
import { Button } from "@/components/base/buttons/button";
export function TaskForm({
  projects,
  categories,
  people,
  selfId,
}: {
  projects: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  people: Array<{ id: string; name: string }>;
  selfId: string;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [primaryAssigneeId, setPrimaryAssigneeId] = useState(selfId);
  const [kind, setKind] = useState("ACTUAL");
  const [status, setStatus] = useState("TODO");
  const [content, setContent] = useState("");
  const [dueDate, setDueDate] = useState("");
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
          version: 0,
          projectId,
          categoryId,
          primaryAssigneeId,
          content,
          kind,
          status,
          workDate: null,
          dueDate: dueDate || null,
          sourceTaskId: null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "创建任务失败");
        return;
      }
      setContent("");
      setDueDate("");
      setMessage("任务已创建");
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
      className="flex flex-col gap-4 rounded-3xl border border-border-button-default p-6"
    >
      <h2 className="text-title-2-medium">创建任务</h2>
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
          onSelectionChange={(key) => setKind(String(key))}
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
