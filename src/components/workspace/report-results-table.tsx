"use client";

import { CalendarDays, FileText } from "lucide-react";
import {
  ResponsiveDataTable,
  type ResponsiveDataTableColumn,
} from "@/components/premium/responsive-data-table";
import { ButtonLink } from "@/components/motion/button/base";
import { cn } from "@/lib/utils";

type ReportRow = {
  id: string;
  type: "DAILY" | "WEEKLY";
  status: "DRAFT" | "SUBMITTED";
  date: string | null;
  weekStart: string | null;
  summary: string;
  author: string;
  wasLate: boolean;
  revisionNumber: number;
};

const columns: ResponsiveDataTableColumn<ReportRow>[] = [
  {
    key: "report",
    header: "报告",
    label: "报告",
    sortable: true,
    hideable: false,
    width: "15rem",
    sortValue: (row) => row.author,
    cell: (row) => (
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <FileText className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{row.author}</p>
          <p className="text-xs text-muted-foreground">
            {row.type === "DAILY" ? "日报" : "周报"}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "period",
    header: "日期",
    label: "日期",
    sortable: true,
    width: "10rem",
    sortValue: (row) => row.date ?? row.weekStart ?? "",
    cell: (row) => (
      <span className="inline-flex items-center gap-2">
        <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
        {row.date ?? row.weekStart ?? "未设置"}
      </span>
    ),
  },
  {
    key: "status",
    header: "状态",
    label: "状态",
    sortable: true,
    width: "10rem",
    cell: (row) => (
      <span className="inline-flex items-center gap-2">
        <span
          className={cn(
            "size-2 rounded-full",
            row.status === "SUBMITTED"
              ? "bg-status-lime-text"
              : "bg-status-yellow-text",
          )}
        />
        {row.status === "DRAFT" ? "草稿" : `已提交 · v${row.revisionNumber}`}
        {row.wasLate ? " · 曾逾期" : ""}
      </span>
    ),
    sortValue: (row) => row.status,
  },
  {
    key: "summary",
    header: "总结",
    label: "总结",
    width: "22rem",
    cell: (row) => (
      <p className="truncate text-sm text-muted-foreground">
        {row.summary || "未填写总结"}
      </p>
    ),
  },
  {
    key: "actions",
    header: "操作",
    label: "操作",
    hideable: false,
    width: "7rem",
    cell: (row) => (
      <ButtonLink
        href={`/reports/${row.id}`}
        variant="outline"
        size="sm"
        className="rounded-lg"
      >
        查看
      </ButtonLink>
    ),
  },
];

export function ReportResultsTable({ rows }: { rows: ReportRow[] }) {
  return (
    <ResponsiveDataTable
      data={rows}
      columns={columns}
      getRowId={(row) => row.id}
      tabs={[
        { value: "all", label: "全部" },
        {
          value: "daily",
          label: "日报",
          filter: (row) => row.type === "DAILY",
        },
        {
          value: "weekly",
          label: "周报",
          filter: (row) => row.type === "WEEKLY",
        },
      ]}
      search={{
        placeholder: "在当前结果中搜索",
        getSearchText: (row) => `${row.author} ${row.summary}`,
      }}
      defaultSort={{ key: "period", direction: "desc" }}
      emptyState="没有符合条件的报告"
    />
  );
}
