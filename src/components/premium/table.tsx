"use client";

import type { ReactNode } from "react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/premium/data-table";
import { cx } from "@/utils/cx";

export type TableSize = "small" | "middle" | "large";

export type TableColumn<T> = {
  key: string;
  title: ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (item: T) => ReactNode;
};

export interface TableProps<T> {
  columns: TableColumn<T>[];
  dataSource: T[];
  rowKey: keyof T | ((item: T, index: number) => string);
  size?: TableSize;
  emptyState?: ReactNode;
  className?: string;
}

const rowHeightBySize: Record<TableSize, number> = {
  small: 40,
  middle: 48,
  large: 56,
};

export function Table<T>({
  columns,
  dataSource,
  rowKey,
  size = "middle",
  emptyState = "暂无数据",
  className,
}: TableProps<T>) {
  const rowHeight = rowHeightBySize[size];
  const height = Math.min(
    Math.max((dataSource.length + 1) * rowHeight, rowHeight * 3),
    440,
  );
  const resolvedColumns: DataTableColumn<T>[] = columns.map((column) => ({
    key: column.key,
    header: column.title,
    width: column.width,
    align: column.align,
    cell: column.render,
  }));

  return (
    <DataTable
      columns={resolvedColumns}
      data={dataSource}
      getRowId={(item, index) => {
        if (typeof rowKey === "function") return rowKey(item, index);
        return String(item[rowKey]);
      }}
      rowHeight={rowHeight}
      height={height}
      emptyState={emptyState}
      className={cx("border-0", className)}
    />
  );
}
