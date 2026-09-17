"use client";
import { useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { Select, SelectItem } from "@/components/base/select/select";
export function BlockerActions({
  id,
  version,
  canAcknowledge,
  canResolve,
  canAssign,
  coordinators = [],
}: {
  id: string;
  version: number;
  canAcknowledge: boolean;
  canResolve: boolean;
  canAssign?: boolean;
  coordinators?: Array<{ id: string; name: string }>;
}) {
  const [pending, setPending] = useState(false);
  const [resolution, setResolution] = useState("");
  const [message, setMessage] = useState("");
  const [coordinatorId, setCoordinatorId] = useState("");
  async function act(action: "ACKNOWLEDGE" | "RESOLVE" | "ASSIGN") {
    if (pending || (action === "RESOLVE" && !resolution.trim())) {
      if (action === "RESOLVE") setMessage("请填写解决说明");
      return;
    }
    setPending(true);
    try {
      const r = await fetch(`/api/blockers/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          resolution,
          version,
          coordinatorId: action === "ASSIGN" ? coordinatorId : undefined,
        }),
      });
      const result = await r.json();
      if (!r.ok) setMessage(result.error);
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
        {canAssign && (
          <>
            <Select
              aria-label="协调负责人"
              selectedKey={coordinatorId || null}
              onSelectionChange={(key) => setCoordinatorId(String(key))}
              isDisabled={pending}
            >
              {coordinators.map((person) => (
                <SelectItem key={person.id} id={person.id}>
                  {person.name}
                </SelectItem>
              ))}
            </Select>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void act("ASSIGN")}
              disabled={pending || !coordinatorId}
            >
              分配协调人
            </Button>
          </>
        )}
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
        <textarea
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          maxLength={5000}
          placeholder="解决说明"
          className="rounded-xl border border-border-button-default p-3"
        />
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
