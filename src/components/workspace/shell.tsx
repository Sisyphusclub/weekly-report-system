"use client";

import {
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  CircleAlert,
  ClipboardCheck,
  FileChartColumn,
  Files,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  PanelLeft,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  AnimatedSidebar,
  AnimatedSidebarClose,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarInset,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarProvider,
  AnimatedSidebarRail,
  AnimatedSidebarTrigger,
  useAnimatedSidebar,
} from "@/components/motion/animated-sidebar";
import {
  MorphingSearch,
  type MorphingSearchItem,
} from "@/components/motion/morphing-search";
import { SignOutButton } from "@/components/workspace/sign-out-button";
import type { Role } from "@/lib/domain";
import { cx } from "@/utils/cx";

type NavKey =
  | "dashboard"
  | "reports"
  | "daily"
  | "blockers"
  | "dictionaries"
  | "projects"
  | "users"
  | "members"
  | "weekly"
  | "notifications"
  | "activity"
  | "calendar"
  | "exemptions"
  | "audit"
  | "settings";

type NavItem = {
  key: NavKey;
  label: string;
  href: string;
  icon: LucideIcon;
  keywords?: string[];
};

const roleLabel: Record<Role, string> = {
  EMPLOYEE: "成员",
  BOSS: "负责人",
  ADMIN: "管理员",
};

export function WorkspaceShell({
  actor,
  selected,
  children,
}: {
  actor: {
    id?: string;
    name: string;
    role: Role;
    username?: string;
    organizationName?: string;
  };
  selected: NavKey;
  children: ReactNode;
}) {
  const router = useRouter();
  const workspaceLabel = actor.organizationName ?? "市场部工作台";
  const groups = navigationForRole(actor.role);
  const searchItems: MorphingSearchItem[] = groups
    .flatMap((group) => group.items)
    .map((item) => ({
      id: item.href,
      title: item.label,
      description: workspaceLabel,
      keywords: item.keywords,
      icon: item.icon,
    }));

  return (
    <div className="min-h-svh bg-background text-text-regular">
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:not-sr-only focus:rounded-xl focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg focus:ring-2 focus:ring-ring"
      >
        跳到主要内容
      </a>
      <AnimatedSidebarProvider
        style={{
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "4.25rem",
          "--sidebar-width-mobile": "18rem",
        }}
      >
        <AnimatedSidebar
          ariaLabel={`${workspaceLabel}导航`}
          collapsible="icon"
          panelClassName="border-border bg-muted/35"
        >
          <AnimatedSidebarHeader className="p-3 pb-2">
            <div className="flex min-h-11 items-center gap-3 overflow-hidden px-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-foreground text-sm font-semibold text-background">
                周
              </span>
              <span className="min-w-0 flex-1 group-data-[state=collapsed]/sidebar:hidden">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {workspaceLabel}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  工作台
                </span>
              </span>
              <AnimatedSidebarClose className="ml-auto text-muted-foreground hover:bg-muted md:hidden">
                <X className="size-4" aria-hidden />
              </AnimatedSidebarClose>
            </div>
          </AnimatedSidebarHeader>

          <AnimatedSidebarContent>
            <AnimatedSidebarGroup className="pb-1">
              <AnimatedSidebarGroupContent>
                <AnimatedSidebarMenu>
                  <WorkspaceSearch
                    items={searchItems}
                    onSelect={(item) => router.push(item.id)}
                  />
                </AnimatedSidebarMenu>
              </AnimatedSidebarGroupContent>
            </AnimatedSidebarGroup>

            {groups.map((group) => (
              <AnimatedSidebarGroup key={group.label}>
                <AnimatedSidebarGroupLabel>
                  {group.label}
                </AnimatedSidebarGroupLabel>
                <AnimatedSidebarGroupContent>
                  <AnimatedSidebarMenu>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <AnimatedSidebarMenuItem
                          key={`${item.key}:${item.href}`}
                        >
                          <AnimatedSidebarMenuButton
                            href={item.href}
                            isActive={selected === item.key}
                            icon={<Icon className="size-4" />}
                          >
                            {item.label}
                          </AnimatedSidebarMenuButton>
                        </AnimatedSidebarMenuItem>
                      );
                    })}
                  </AnimatedSidebarMenu>
                </AnimatedSidebarGroupContent>
              </AnimatedSidebarGroup>
            ))}
          </AnimatedSidebarContent>

          <AnimatedSidebarFooter className="gap-1">
            <AnimatedSidebarMenu>
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  href="/security"
                  icon={<KeyRound className="size-4" />}
                >
                  账号安全
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
            </AnimatedSidebarMenu>
            <SignOutButton collapseLabel />
            <div className="mt-1 flex min-h-11 items-center gap-3 overflow-hidden rounded-xl px-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials(actor.name)}
              </span>
              <span className="min-w-0 flex-1 group-data-[state=collapsed]/sidebar:hidden">
                <span className="block truncate text-sm font-medium text-foreground">
                  {actor.name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {roleLabel[actor.role]}
                  {actor.username ? ` · ${actor.username}` : ""}
                </span>
              </span>
            </div>
          </AnimatedSidebarFooter>
          <AnimatedSidebarRail />
        </AnimatedSidebar>

        <AnimatedSidebarInset className="bg-background-full">
          <header className="sticky top-0 z-30 flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/90 px-4 backdrop-blur-xl sm:px-6 xl:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <AnimatedSidebarTrigger className="-ml-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <PanelLeft className="size-4" aria-hidden />
              </AnimatedSidebarTrigger>
              <div className="h-5 w-px bg-border" aria-hidden />
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">
                  {workspaceLabel}
                </p>
                <p className="truncate text-sm font-medium text-foreground">
                  {pageLabel(selected, actor.role)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1.5 sm:flex">
                <span className="size-2 rounded-full bg-status-lime-text" />
                <span className="text-xs text-muted-foreground">系统正常</span>
              </div>
              <div className="hidden px-2 text-xs text-muted-foreground md:block">
                {formatToday()}
              </div>
              <a
                href="/notifications"
                aria-label="通知中心"
                className={cx(
                  "relative grid size-10 place-items-center rounded-xl text-muted-foreground outline-none transition-colors",
                  "hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                  selected === "notifications" && "bg-muted text-foreground",
                )}
              >
                <Bell className="size-4" aria-hidden />
                {actor.role === "BOSS" && (
                  <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-destructive" />
                )}
              </a>
            </div>
          </header>

          <div
            id="main-content"
            className="mx-auto flex w-full max-w-[1560px] min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8 xl:py-8"
          >
            {children}
          </div>
        </AnimatedSidebarInset>
      </AnimatedSidebarProvider>
    </div>
  );
}

function WorkspaceSearch({
  items,
  onSelect,
}: {
  items: MorphingSearchItem[];
  onSelect: (item: MorphingSearchItem) => void;
}) {
  const { state } = useAnimatedSidebar();
  return (
    <AnimatedSidebarMenuItem>
      <MorphingSearch
        items={items}
        placeholder="搜索功能"
        emptyMessage="没有匹配的功能"
        shortcut="k"
        iconOnly={state === "collapsed"}
        onSelect={onSelect}
        className={cx(state === "collapsed" ? "mx-auto" : "h-10 w-full")}
      />
    </AnimatedSidebarMenuItem>
  );
}

function navigationForRole(
  role: Role,
): Array<{ label: string; items: NavItem[] }> {
  if (role === "ADMIN") {
    return [
      {
        label: "工作区",
        items: [
          nav("dashboard", "日报总览", "/dashboard", LayoutDashboard),
          nav("reports", "我的报告", "/reports", FileChartColumn),
          nav("notifications", "通知中心", "/notifications", Bell),
        ],
      },
      {
        label: "系统维护",
        items: [
          nav("users", "账号管理", "/admin/users", UserRoundCog),
          nav("projects", "项目管理", "/admin/projects", FolderKanban),
          nav(
            "dictionaries",
            "分类与单位",
            "/admin/dictionaries",
            SlidersHorizontal,
          ),
          nav("calendar", "工作日历", "/admin/calendar", CalendarDays),
          nav(
            "exemptions",
            "请假与免报",
            "/admin/exemptions",
            ClipboardCheck,
          ),
          nav("audit", "审计日志", "/admin/audit", ShieldCheck),
          nav("settings", "系统设置", "/admin/settings", Settings),
        ],
      },
    ];
  }
  if (role === "BOSS") {
    return [
      {
        label: "团队视角",
        items: [
          nav("dashboard", "工作总览", "/boss/dashboard", LayoutDashboard),
          nav("members", "成员看板", "/boss/members", Users),
          nav("projects", "项目协同", "/boss/projects", FolderKanban),
          nav("blockers", "阻塞中心", "/blockers", CircleAlert),
          nav("reports", "报告查询", "/reports", ChartNoAxesCombined),
          nav("activity", "业务变更", "/activity", Files),
          nav("notifications", "通知中心", "/notifications", Bell),
        ],
      },
    ];
  }
  return [
    {
      label: "工作区",
      items: [
        nav("dashboard", "概览", "/dashboard", LayoutDashboard),
        nav("daily", "今日工作", "/daily", ClipboardCheck),
        nav("weekly", "本周周报", "/weekly", CalendarDays),
        nav("projects", "项目看板", "/projects", FolderKanban),
        nav("blockers", "阻塞", "/blockers", CircleAlert),
        nav("reports", "报告", "/reports", Files),
        nav("activity", "团队动态", "/activity", Users),
        nav("notifications", "通知中心", "/notifications", Bell),
      ],
    },
  ];
}

function nav(
  key: NavKey,
  label: string,
  href: string,
  icon: LucideIcon,
): NavItem {
  return { key, label, href, icon, keywords: [key, label] };
}

function initials(name: string) {
  return name.trim().slice(0, 1) || "周";
}

function pageLabel(selected: NavKey, role: Role) {
  return (
    {
      dashboard:
        role === "ADMIN" ? "日报总览" : role === "BOSS" ? "工作总览" : "概览",
      daily: "今日工作台",
      weekly: "本周周报",
      blockers: "阻塞中心",
      reports: role === "ADMIN" ? "我的报告" : "报告查询",
      notifications: "通知中心",
      activity: role === "BOSS" ? "业务变更" : "团队动态",
      users: "账号管理",
      members: "成员看板",
      projects: role === "BOSS" ? "项目协同" : "项目管理",
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
    timeZone: "Asia/Shanghai",
  }).format(new Date());
}
