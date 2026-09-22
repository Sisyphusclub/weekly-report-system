"use client";
import { useState } from "react";
import { Button } from "@/components/motion/button/base";
import { FormStatus, Textarea } from "@/components/premium/forms";
export function BlockerActions({
  id,
  version,
  canAcknowledge,
  canResolve,
}: {
  id: string;
  version: number;
  canAcknowledge: boolean;
  canResolve: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [resolution, setResolution] = useState("");
  const [message, setMessage] = useState("");
  async function act(action: "ACKNOWLEDGE" | "RESOLVE") {
    if (pending || (action === "RESOLVE" && !resolution.trim())) {
      if (action === "RESOLVE") setMessage("请填写解决说明");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const r = await fetch(`/api/blockers/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          resolution,
          version,
        }),
      });
      const result = await r.json();
      if (!r.ok) setMessage(result.error ?? "操作失败，请稍后重试");
      else location.reload();
    } catch {
      setMessage("操作失败，请刷新后重试");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {canAcknowledge && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void act("ACKNOWLEDGE")}
            disabled={pending}
          >
            确认接收
          </Button>
        )}
        {canResolve && (
          <Button
            type="button"
            onClick={() => void act("RESOLVE")}
            disabled={pending}
          >
            标记解决
          </Button>
        )}
      </div>
      {canResolve && (
        <Textarea
          label="解决说明"
          value={resolution}
          onChange={(value) => setResolution(value)}
          maxLength={5000}
          placeholder="说明已采取的处理措施…"
          rows={4}
          isDisabled={pending}
        />
      )}
      {message && (
        <FormStatus tone="error" role="alert">
          {message}
        </FormStatus>
      )}
    </div>
  );
}
