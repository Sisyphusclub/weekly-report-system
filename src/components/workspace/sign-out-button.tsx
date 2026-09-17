"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { authClient } from "@/lib/auth-client";
export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="ghost"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setFailed(false);
          try {
            const result = await authClient.signOut();
            if (result.error) setFailed(true);
            else {
              router.replace("/login");
              router.refresh();
            }
          } catch {
            setFailed(true);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "正在退出…" : "退出登录"}
      </Button>
      {failed && (
        <p role="alert" className="text-caption-1-regular">
          退出失败，请重试
        </p>
      )}
    </div>
  );
}
