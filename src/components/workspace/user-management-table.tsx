"use client";

import { ShieldCheck, UserRound } from "lucide-react";
import {
  ResponsiveDataTable,
  type ResponsiveDataTableColumn,
} from "@/components/premium/responsive-data-table";
import { ResetPasswordButton } from "@/components/workspace/reset-password-button";
import { UserStatusButton } from "@/components/workspace/user-status-button";
import { cn } from "@/lib/utils";

type UserRow = {
  id: string;
  name: string;
  username: string;
  role: "EMPLOYEE" | "BOSS" | "ADMIN";
  status: "ACTIVE" | "DISABLED";
  title: string | null;
};

const roleLabel = {
  EMPLOYEE: "员工",
  BOSS: "负责人",
  ADMIN: "管理员",
} as const;

const statusLabel = {
  ACTIVE: "正常",
  DISABLED: "停用",
} as const;

const columns: ResponsiveDataTableColumn<UserRow>[] = [
  {
    key: "account",
    header: "账号",
    label: "账号",
    sortable: true,
    hideable: false,
    width: "15rem",
    sortValue: (row) => row.name,
    cell: (row) => (
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {row.name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{row.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            @{row.username}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "role",
    header: "角色",
    label: "角色",
    sortable: true,
    width: "8rem",
    cell: (row) => (
      <span className="inline-flex items-center gap-1.5 text-sm">
        {row.role === "ADMIN" ? (
          <ShieldCheck className="size-4 text-primary" aria-hidden />
        ) : (
          <UserRound className="size-4 text-muted-foreground" aria-hidden />
        )}
        {roleLabel[row.role]}
      </span>
    ),
    sortValue: (row) => roleLabel[row.role],
  },
  {
    key: "title",
    header: "职务",
    label: "职务",
    sortable: true,
    width: "11rem",
    cell: (row) => row.title ?? "未设置",
    sortValue: (row) => row.title ?? "",
  },
  {
    key: "status",
    header: "状态",
    label: "状态",
    sortable: true,
    width: "9rem",
    cell: (row) => (
      <span className="inline-flex items-center gap-2">
        <span
          className={cn(
            "size-2 rounded-full",
            row.status === "ACTIVE" ? "bg-emerald-700" : "bg-destructive",
          )}
        />
        {statusLabel[row.status]}
      </span>
    ),
    sortValue: (row) => statusLabel[row.status],
  },
  {
    key: "actions",
    header: "操作",
    label: "操作",
    hideable: false,
    width: "17rem",
    cell: (row) => (
      <div className="flex flex-wrap items-center gap-2">
        <UserStatusButton id={row.id} status={row.status} />
        <ResetPasswordButton id={row.id} username={row.username} />
      </div>
    ),
  },
];

export function UserManagementTable({ rows }: { rows: UserRow[] }) {
  return (
    <ResponsiveDataTable
      data={rows}
      columns={columns}
      getRowId={(row) => row.id}
      tabs={[
        { value: "all", label: "全部" },
        {
          value: "active",
          label: "正常",
          filter: (row) => row.status === "ACTIVE",
        },
        {
          value: "attention",
          label: "需处理",
          filter: (row) => row.status !== "ACTIVE",
        },
      ]}
      filter={{
        label: "角色",
        options: [
          { value: "EMPLOYEE", label: "员工" },
          { value: "BOSS", label: "负责人" },
          { value: "ADMIN", label: "管理员" },
        ],
        getValue: (row) => row.role,
      }}
      search={{
        placeholder: "搜索姓名或用户名",
        getSearchText: (row) =>
          `${row.name} ${row.username} ${row.title ?? ""}`,
      }}
      defaultSort={{ key: "account", direction: "asc" }}
      emptyState="没有符合条件的账号"
    />
  );
}
