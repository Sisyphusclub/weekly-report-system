"use client";
import { useState } from "react";
import { Button } from "@/components/base/buttons/button";
export function UserStatusButton({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function toggle() {
    setPending(true);
    setMessage("");
    try {
      const next = status === "DISABLED" ? "ACTIVE" : "DISABLED";
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const result = await response.json();
      if (!response.ok) setMessage(result.error);
      else location.reload();
    } catch {
      setMessage("操作失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }
  return (
    <span className="flex items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={toggle}
      >
        {status === "DISABLED" ? "启用" : "停用"}
      </Button>
      {message && <span role="status">{message}</span>}
    </span>
  );
}
