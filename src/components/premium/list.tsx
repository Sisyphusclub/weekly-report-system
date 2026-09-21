import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

export interface ListProps<T> {
  dataSource: readonly T[];
  rowKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  emptyState?: ReactNode;
  className?: string;
  itemClassName?: string | ((item: T, index: number) => string);
}

export function List<T>({
  dataSource,
  rowKey,
  renderItem,
  emptyState = "暂无数据",
  className,
  itemClassName,
}: ListProps<T>) {
  if (!dataSource.length) {
    return (
      <div className="grid min-h-36 place-items-center rounded-lg border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
        {emptyState}
      </div>
    );
  }

  return (
    <ul data-slot="list" className={cx("space-y-2.5", className)}>
      {dataSource.map((item, index) => (
        <li
          key={rowKey(item, index)}
          data-slot="list-item"
          className={cx(
            "min-w-0 rounded-lg border border-border p-3",
            typeof itemClassName === "function"
              ? itemClassName(item, index)
              : itemClassName,
          )}
        >
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
}

export interface ListItemProps {
  index: string;
  title: ReactNode;
  trailing?: ReactNode;
  footer?: ReactNode;
}

export function ListItem({ index, title, trailing, footer }: ListItemProps) {
  return (
    <article className="min-w-0">
      <div className="grid min-w-0 grid-cols-[24px_minmax(0,1fr)_auto] items-start gap-x-2.5">
        <p className="pt-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
          {index}
        </p>
        <h4 className="min-w-0 text-sm font-medium leading-5 text-foreground">
          {title}
        </h4>
        {trailing}
      </div>
      {footer ? (
        <div className="mt-2 ml-8 flex min-w-0 items-center justify-between gap-2">
          {footer}
        </div>
      ) : null}
    </article>
  );
}
