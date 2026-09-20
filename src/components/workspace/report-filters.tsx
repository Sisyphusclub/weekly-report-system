"use client";

import { RotateCcw, Search } from "lucide-react";
import type { ComponentProps } from "react";
import { Card, CardBody, CardHeader } from "@/components/premium/cards/card";
import { DatePicker, Input } from "@/components/premium/forms";
import { Select, SelectItem } from "@/components/premium/forms";
import { Button, ButtonLink } from "@/components/motion/button/base";
import type { ReportFilter } from "@/lib/report-filter";

export function ReportFilters({
  query,
  filters,
  members,
  projects,
  categories,
}: {
  query: string;
  filters: ReportFilter;
  members: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
}) {
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <Card className="overflow-visible">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
        <div>
          <h2 className="text-sm font-semibold leading-5 text-slate-900">
            筛选报告
          </h2>
          <p className="mt-0.5 text-xs leading-4 text-slate-500">
            按关键词、日期和报告维度缩小查询范围
          </p>
        </div>
        {activeFilterCount > 0 ? (
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium leading-4 text-blue-700">
            已应用 {activeFilterCount} 项条件
          </span>
        ) : null}
      </CardHeader>
      <CardBody>
        <form
          action="/reports"
          role="search"
          aria-label="报告筛选"
          className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 xl:grid-cols-12"
        >
          <Input
            className="sm:col-span-2 xl:col-span-4"
            size="small"
            name="q"
            label="关键词"
            defaultValue={query}
            placeholder="搜索报告总结或内容"
            maxLength={200}
            leadingIcon={Search}
          />
          <DatePicker
            className="xl:col-span-2"
            size="small"
            name="from"
            label="开始日期"
            defaultValue={filters.from ?? ""}
          />
          <DatePicker
            className="xl:col-span-2"
            size="small"
            name="to"
            label="结束日期"
            defaultValue={filters.to ?? ""}
          />
          <FilterSelect
            className="xl:col-span-2"
            id="report-member-label"
            label="成员"
            name="member"
            defaultSelectedKey={filters.member ?? "ALL"}
          >
            <SelectItem id="ALL">全部成员</SelectItem>
            {members.map((member) => (
              <SelectItem
                key={member.id}
                id={member.id}
                textValue={member.name}
              >
                {member.name}
              </SelectItem>
            ))}
            {filters.member &&
              !members.some((member) => member.id === filters.member) && (
                <SelectItem id={filters.member}>所选成员不可用</SelectItem>
              )}
          </FilterSelect>
          <FilterSelect
            className="xl:col-span-2"
            id="report-project-label"
            label="项目"
            name="project"
            defaultSelectedKey={filters.project ?? "ALL"}
          >
            <SelectItem id="ALL">全部项目</SelectItem>
            {projects.map((item) => (
              <SelectItem key={item.id} id={item.id} textValue={item.name}>
                {item.name}
              </SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect
            className="xl:col-span-2"
            id="report-category-label"
            label="分类"
            name="category"
            defaultSelectedKey={filters.category ?? "ALL"}
          >
            <SelectItem id="ALL">全部分类</SelectItem>
            {categories.map((item) => (
              <SelectItem key={item.id} id={item.id} textValue={item.name}>
                {item.name}
              </SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect
            className="xl:col-span-2"
            id="report-type-label"
            label="报告类型"
            name="type"
            defaultSelectedKey={filters.type ?? "ALL"}
          >
            <SelectItem id="ALL">全部类型</SelectItem>
            <SelectItem id="DAILY">日报</SelectItem>
            <SelectItem id="WEEKLY">周报</SelectItem>
          </FilterSelect>
          <FilterSelect
            className="xl:col-span-2"
            id="report-status-label"
            label="报告状态"
            name="status"
            defaultSelectedKey={filters.status ?? "ALL"}
          >
            <SelectItem id="ALL">全部状态</SelectItem>
            <SelectItem id="DRAFT">本人草稿</SelectItem>
            <SelectItem id="SUBMITTED">已提交</SelectItem>
          </FilterSelect>
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 sm:col-span-2 xl:col-span-12">
            <Button type="submit" size="small" leadingIcon={Search}>
              查询报告
            </Button>
            <ButtonLink
              href="/reports"
              variant="ghost"
              size="small"
              leadingIcon={RotateCcw}
            >
              重置条件
            </ButtonLink>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function FilterSelect({
  id,
  label,
  className,
  ...props
}: ComponentProps<typeof Select> & { id: string; label: string }) {
  return (
    <div className={className}>
      <span
        className="mb-1.5 block text-xs font-medium leading-4 text-slate-700"
        id={id}
      >
        {label}
      </span>
      <Select
        {...props}
        aria-labelledby={id}
        triggerClassName="min-h-9 rounded-lg px-3 text-sm"
      />
    </div>
  );
}
