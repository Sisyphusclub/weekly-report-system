import { ButtonLink } from "@/components/base/buttons/button";
import { SignOutButton } from "@/components/workspace/sign-out-button";
import { cx } from "@/utils/cx";
import type { Role } from "@/lib/domain";

export function WorkspaceShell({
  actor,
  selected,
  children,
}: {
  actor: { name: string; role: Role; organizationName?: string };
  selected:
    | "dashboard"
    | "reports"
    | "daily"
    | "blockers"
    | "dictionaries"
    | "projects"
    | "users"
    | "weekly"
    | "notifications"
    | "tasks"
    | "calendar"
    | "exemptions"
    | "audit"
    | "settings";
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background-full">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background-primary-default focus:p-4"
      >
        跳到主要内容
      </a>
      <header className="border-b border-separator-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent-600 text-headline-medium text-text-white">
              周
            </span>
            <span className="break-words text-headline-medium">
              {actor.organizationName ?? "市场部工作看板"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-body-regular text-text-secondary">
              {actor.name} ·{" "}
              {{ EMPLOYEE: "员工", BOSS: "老板", ADMIN: "管理员" }[actor.role]}
            </span>
            <ButtonLink href="/security" variant="ghost">
              账号安全
            </ButtonLink>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 p-4 md:p-6 lg:grid-cols-[180px_minmax(0,1fr)]">
        <nav aria-label="主要导航" className="flex flex-wrap gap-2 lg:flex-col">
          {[
            ...(actor.role === "ADMIN"
              ? [
                  {
                    key: "users",
                    label: "账号管理",
                    href: "/admin/users",
                  },
                  {
                    key: "projects",
                    label: "项目管理",
                    href: "/admin/projects",
                  },
                  {
                    key: "dictionaries",
                    label: "分类与单位",
                    href: "/admin/dictionaries",
                  },
                  {
                    key: "calendar",
                    label: "工作日历",
                    href: "/admin/calendar",
                  },
                  {
                    key: "exemptions",
                    label: "请假与免报",
                    href: "/admin/exemptions",
                  },
                  { key: "audit", label: "审计日志", href: "/admin/audit" },
                  { key: "tasks", label: "任务数据", href: "/admin/tasks" },
                  {
                    key: "settings",
                    label: "系统设置",
                    href: "/admin/settings",
                  },
                ]
              : []),
            ...(actor.role !== "ADMIN"
              ? [{ key: "daily", label: "填写日报", href: "/daily" }]
              : []),
            ...(actor.role !== "ADMIN"
              ? [{ key: "blockers", label: "阻塞中心", href: "/blockers" }]
              : []),
            ...(actor.role !== "ADMIN"
              ? [{ key: "weekly", label: "填写周报", href: "/weekly" }]
              : []),
            ...(actor.role !== "ADMIN"
              ? [{ key: "tasks", label: "任务管理", href: "/tasks" }]
              : []),
            { key: "notifications", label: "通知中心", href: "/notifications" },
            ...(actor.role === "BOSS"
              ? [{ key: "audit", label: "业务变更", href: "/activity" }]
              : []),
            {
              key: "dashboard",
              label: actor.role === "ADMIN" ? "系统概览" : "工作看板",
              href: "/dashboard",
            },
            {
              key: "reports",
              label: actor.role === "ADMIN" ? "我的报告" : "报告查询",
              href: "/reports",
            },
          ].map((item) => (
            <ButtonLink
              key={item.key}
              href={item.href}
              variant={selected === item.key ? "secondary" : "ghost"}
              aria-current={selected === item.key ? "page" : undefined}
              className={cx(
                "justify-start",
                selected === item.key && "bg-background-secondary-default",
              )}
            >
              {item.label}
            </ButtonLink>
          ))}
        </nav>
        <main id="main-content" className="flex min-w-0 flex-col gap-6">
          {children}
        </main>
      </div>
    </div>
  );
}
