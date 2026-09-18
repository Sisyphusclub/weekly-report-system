import {
  RiAlarmWarningLine,
  RiArrowRightLine,
  RiCalendarScheduleLine,
  RiDashboardLine,
  RiFileChartLine,
  RiFlowChart,
  RiFolderChartLine,
  RiListCheck3,
  RiLockLine,
  RiNotification3Line,
  RiSettings3Line,
  RiShieldUserLine,
  RiStackLine,
  RiTeamLine,
  RiTimeLine,
} from "@remixicon/react";
import { ButtonLink } from "@/components/base/buttons/button";
import { SignOutButton } from "@/components/workspace/sign-out-button";
import { Avatar } from "@/components/base/avatar/avatar";
import { cx } from "@/utils/cx";
import type { Role } from "@/lib/domain";

type NavKey =
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

const roleLabel: Record<Role, string> = {
  EMPLOYEE: "成员",
  BOSS: "负责人",
  ADMIN: "管理员",
};
const initials = (name: string) => name.trim().slice(0, 1) || "周";

export function WorkspaceShell({
  actor,
  selected,
  children,
}: {
  actor: { id?: string; name: string; role: Role; organizationName?: string };
  selected: NavKey;
  children: React.ReactNode;
}) {
  const isAdmin = actor.role === "ADMIN";
  const isBoss = actor.role === "BOSS";
  const workspaceLabel = actor.organizationName ?? "市场部工作台";
  const workspaceNav = [
    ...(actor.role !== "ADMIN"
      ? [
          {
            key: "daily" as const,
            label: "今日工作台",
            href: "/daily",
            icon: RiListCheck3,
          },
          {
            key: "weekly" as const,
            label: "本周周报",
            href: "/weekly",
            icon: RiFileChartLine,
          },
          {
            key: "tasks" as const,
            label: "任务管理",
            href: "/tasks",
            icon: RiStackLine,
          },
          {
            key: "blockers" as const,
            label: "阻塞中心",
            href: "/blockers",
            icon: RiAlarmWarningLine,
          },
        ]
      : []),
    {
      key: "dashboard" as const,
      label: isAdmin ? "日报总览" : "工作看板",
      href: "/dashboard",
      icon: RiDashboardLine,
    },
    {
      key: "reports" as const,
      label: isAdmin ? "我的报告" : "报告查询",
      href: "/reports",
      icon: RiFileChartLine,
    },
    {
      key: "notifications" as const,
      label: "通知中心",
      href: "/notifications",
      icon: RiNotification3Line,
    },
  ];
  const extraNav = isAdmin
    ? [
        {
          key: "users" as const,
          label: "账号管理",
          href: "/admin/users",
          icon: RiTeamLine,
        },
        {
          key: "projects" as const,
          label: "项目管理",
          href: "/admin/projects",
          icon: RiFolderChartLine,
        },
        {
          key: "dictionaries" as const,
          label: "分类与单位",
          href: "/admin/dictionaries",
          icon: RiFlowChart,
        },
        {
          key: "calendar" as const,
          label: "工作日历",
          href: "/admin/calendar",
          icon: RiCalendarScheduleLine,
        },
        {
          key: "exemptions" as const,
          label: "请假与免报",
          href: "/admin/exemptions",
          icon: RiTimeLine,
        },
        {
          key: "audit" as const,
          label: "审计日志",
          href: "/admin/audit",
          icon: RiShieldUserLine,
        },
        {
          key: "settings" as const,
          label: "系统设置",
          href: "/admin/settings",
          icon: RiSettings3Line,
        },
      ]
    : isBoss
      ? [
          {
            key: "audit" as const,
            label: "业务变更",
            href: "/activity",
            icon: RiTimeLine,
          },
          {
            key: "projects" as const,
            label: "项目协同",
            href: "/dashboard#projects",
            icon: RiFolderChartLine,
          },
        ]
      : [];

  return (
    <div className="min-h-screen bg-background-full">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background-primary-default focus:p-4"
      >
        跳到主要内容
      </a>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[244px] shrink-0 flex-col border-r border-separator-border bg-background-primary-default lg:flex">
          <div className="flex h-[76px] items-center gap-3 border-b border-separator-border px-5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent-600 text-headline-semibold text-text-white shadow-xs">
              周
            </span>
            <div className="min-w-0">
              <p className="truncate text-body-semibold text-text-primary">
                {workspaceLabel}
              </p>
              <p className="mt-0.5 text-caption-1-regular text-text-tertiary">
                市场部协作空间
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-5">
            <p className="px-3 text-caption-1-semibold uppercase tracking-[0.08em] text-text-tertiary">
              工作区
            </p>
            <nav aria-label="工作区导航" className="mt-2 flex flex-col gap-1">
              {workspaceNav.map((item) => (
                <NavItem
                  key={item.key}
                  item={item}
                  selected={selected === item.key}
                />
              ))}
            </nav>
            {extraNav.length > 0 && (
              <>
                <p className="mt-7 px-3 text-caption-1-semibold uppercase tracking-[0.08em] text-text-tertiary">
                  {isAdmin ? "系统维护" : "团队视角"}
                </p>
                <nav aria-label="管理导航" className="mt-2 flex flex-col gap-1">
                  {extraNav.map((item) => (
                    <NavItem
                      key={`${item.key}-${item.href}`}
                      item={item}
                      selected={selected === item.key}
                    />
                  ))}
                </nav>
              </>
            )}
          </div>
          <div className="border-t border-separator-border p-3">
            <div className="flex items-center gap-3 rounded-xl p-2.5">
              <Avatar initials={initials(actor.name)} color="blue" size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-medium text-text-primary">
                  {actor.name}
                </p>
                <p className="text-caption-1-regular text-text-tertiary">
                  {roleLabel[actor.role]}
                </p>
              </div>
              <ButtonLink
                href="/security"
                variant="ghost"
                iconOnly
                leadingIcon={RiLockLine}
                aria-label="账号安全"
                className="size-8 p-0"
              />
            </div>
            <SignOutButton />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-separator-border bg-background-primary-default/95 backdrop-blur">
            <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-600 text-body-semibold text-text-white lg:hidden">
                  周
                </span>
                <div className="min-w-0">
                  <p className="truncate text-caption-1-regular text-text-tertiary">
                    {workspaceLabel}
                  </p>
                  <p className="truncate text-body-semibold text-text-primary">
                    {pageLabel(selected)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                <div className="hidden items-center gap-2 rounded-lg bg-background-secondary-default px-3 py-2 sm:flex">
                  <span className="size-2 rounded-full bg-state-success-base" />
                  <span className="text-caption-1-medium text-text-secondary">
                    系统正常
                  </span>
                </div>
                <div className="hidden items-center gap-2 md:flex">
                  <RiCalendarScheduleLine
                    className="size-4 text-text-tertiary"
                    aria-hidden
                  />
                  <span className="text-caption-1-medium text-text-secondary">
                    {formatToday()}
                  </span>
                </div>
                <ButtonLink
                  href="/notifications"
                  variant="ghost"
                  iconOnly
                  leadingIcon={RiNotification3Line}
                  aria-label="通知中心"
                  className="relative size-9 p-0"
                >
                  <>
                    {isBoss && (
                    <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-status-rose-text" />
                    )}
                  </>
                </ButtonLink>
                <div className="lg:hidden">
                  <SignOutButton />
                </div>
              </div>
            </div>
          </header>
          <main
            id="main-content"
            className="mx-auto flex w-full max-w-[1560px] min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8 xl:py-8"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  item,
  selected,
}: {
  item: {
    key: NavKey;
    label: string;
    href: string;
    icon: React.ComponentType<{
      className?: string;
      "aria-hidden"?: boolean | "true" | "false";
    }>;
  };
  selected: boolean;
}) {
  const Icon = item.icon;
  return (
    <ButtonLink
      href={item.href}
      variant="ghost"
      aria-current={selected ? "page" : undefined}
      className={cx(
        "group h-10 justify-start gap-2.5 rounded-lg px-3 text-body-medium",
        selected
          ? "bg-background-secondary-default text-text-primary shadow-xs"
          : "text-text-secondary hover:text-text-primary",
      )}
    >
      <Icon
        className={cx(
          "size-[18px] shrink-0",
          selected
            ? "text-accent-600"
            : "text-text-tertiary group-hover:text-text-primary",
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {selected && (
        <RiArrowRightLine className="size-4 text-text-tertiary" aria-hidden />
      )}
    </ButtonLink>
  );
}

function pageLabel(selected: NavKey) {
  return (
    {
      dashboard: "工作看板",
      daily: "今日工作台",
      weekly: "本周周报",
      tasks: "任务管理",
      blockers: "阻塞中心",
      reports: "报告查询",
      notifications: "通知中心",
      users: "账号管理",
      projects: "项目管理",
      dictionaries: "分类与单位",
      calendar: "工作日历",
      exemptions: "请假与免报",
      audit: "审计日志",
      settings: "系统设置",
    } satisfies Record<NavKey, string>
  )[selected];
}

function formatToday() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(new Date());
}
