"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/base/input/input";
import { Select, SelectItem } from "@/components/base/select/select";
import { Button } from "@/components/base/buttons/button";
export function CreateUserForm() {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [role, setRole] = useState("EMPLOYEE");
  const [message, setMessage] = useState("");
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...fields, role }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error);
        return;
      }
      setMessage("账号已创建，可立即登录。");
      form.reset();
      router.refresh();
    } catch {
      setMessage("未能确认创建结果，请核对账号列表后重试。");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <section className="rounded-3xl border border-border-button-default p-6">
      <h2 className="text-title-2-medium">创建账号</h2>
      <form onSubmit={save} className="mt-4 flex flex-col gap-4">
        <Input
          name="username"
          label="用户名"
          hint="3–30 位字母、数字、下划线或点"
          isRequired
          maxLength={30}
          isDisabled={pending}
        />
        <Input
          name="name"
          label="姓名"
          isRequired
          maxLength={100}
          isDisabled={pending}
        />
        <Input name="title" label="岗位" maxLength={100} isDisabled={pending} />
        <Select
          aria-label="账号角色"
          selectedKey={role}
          onSelectionChange={(key) => setRole(String(key))}
          isDisabled={pending}
        >
          <SelectItem id="EMPLOYEE">员工</SelectItem>
          <SelectItem id="BOSS">老板</SelectItem>
          <SelectItem id="ADMIN">管理员</SelectItem>
        </Select>
        <Input
          name="password"
          label="登录密码"
          hint="12–128 位，创建后立即生效"
          type="password"
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          isRequired
          isDisabled={pending}
        />
        <Button type="submit" disabled={pending}>
          {pending ? "正在创建…" : "创建账号"}
        </Button>
      </form>
      {message && (
        <p role="status" className="mt-4">
          {message}
        </p>
      )}
    </section>
  );
}
