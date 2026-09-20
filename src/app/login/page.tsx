import { CircleAlert } from "lucide-react";
import { AuthSplit } from "@/components/premium/auth/auth-split";
import { LoginForm } from "@/components/workspace/login-form";
import { configurationStatus } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "登录" };

const demoAccounts =
  process.env.NODE_ENV === "development"
    ? [
        {
          label: "员工",
          username: "demo_employee",
          password: "DemoPassw0rd!2026",
        },
        {
          label: "负责人",
          username: "demo_boss",
          password: "DemoPassw0rd!2026",
        },
        {
          label: "管理员",
          username: "demo_admin",
          password: "DemoPassw0rd!2026",
        },
      ]
    : [];

export default function LoginPage() {
  const configured = configurationStatus().ready;

  return (
    <main>
      <AuthSplit>
        {!configured ? (
          <div
            role="status"
            className="mb-5 flex gap-3 rounded-xl border border-border bg-muted/60 p-4"
          >
            <CircleAlert
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                系统正在初始化
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                当前环境尚未完成初始化，请联系管理员。
              </p>
            </div>
          </div>
        ) : null}
        <LoginForm configured={configured} demoAccounts={demoAccounts} />
      </AuthSplit>
    </main>
  );
}
