"use client";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/motion/button/base";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function SignOutButton({
  className,
  collapseLabel = false,
}: {
  className?: string;
  collapseLabel?: boolean;
} = {}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="ghost"
        size="small"
        leadingIcon={LogOut}
        disabled={busy}
        className={cn(
          "flex min-h-9 w-full items-center gap-2.5 overflow-hidden rounded-xl px-3 text-left text-sm font-medium text-muted-foreground outline-none transition-colors",
          "hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
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
        <span
          className={cn(
            "truncate",
            collapseLabel && "group-data-[state=collapsed]/sidebar:hidden",
          )}
        >
          {busy ? "正在退出..." : "退出登录"}
        </span>
      </Button>
      {failed && (
        <p role="alert" className="px-3 text-xs text-destructive">
          退出失败，请重试
        </p>
      )}
    </div>
  );
}
