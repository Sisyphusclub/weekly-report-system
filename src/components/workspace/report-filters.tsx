"use client";

import { Input } from "@/components/premium/forms";
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
  return (
    <form action="/reports" className="flex flex-wrap items-end gap-3">
      <Input
        name="q"
        label="搜索报告总结"
        defaultValue={query}
        placeholder="输入关键词"
        maxLength={200}
      />
      <Input
        name="from"
        type="date"
        label="开始日期"
        defaultValue={filters.from ?? ""}
      />
      <Input
        name="to"
        type="date"
        label="结束日期"
        defaultValue={filters.to ?? ""}
      />
      <div className="flex flex-col gap-2">
        <span className="text-body-medium" id="report-member-label">
          成员
        </span>
        <Select
          name="member"
          aria-labelledby="report-member-label"
          defaultSelectedKey={filters.member ?? "ALL"}
        >
          <SelectItem id="ALL">全部成员</SelectItem>
          {members.map((member) => (
            <SelectItem key={member.id} id={member.id} textValue={member.name}>
              {member.name}
            </SelectItem>
          ))}
          {filters.member &&
            !members.some((member) => member.id === filters.member) && (
              <SelectItem id={filters.member}>所选成员不可用</SelectItem>
            )}
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-body-medium" id="report-project-label">
          项目
        </span>
        <Select
          name="project"
          aria-labelledby="report-project-label"
          defaultSelectedKey={filters.project ?? "ALL"}
        >
          <SelectItem id="ALL">全部项目</SelectItem>
          {projects.map((item) => (
            <SelectItem key={item.id} id={item.id} textValue={item.name}>
              {item.name}
            </SelectItem>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-body-medium" id="report-category-label">
          分类
        </span>
        <Select
          name="category"
          aria-labelledby="report-category-label"
          defaultSelectedKey={filters.category ?? "ALL"}
        >
          <SelectItem id="ALL">全部分类</SelectItem>
          {categories.map((item) => (
            <SelectItem key={item.id} id={item.id} textValue={item.name}>
              {item.name}
            </SelectItem>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-body-medium" id="report-task-status-label">
          任务状态
        </span>
        <Select
          name="taskStatus"
          aria-labelledby="report-task-status-label"
          defaultSelectedKey={filters.taskStatus ?? "ALL"}
        >
          <SelectItem id="ALL">全部任务状态</SelectItem>
          <SelectItem id="TODO">待处理</SelectItem>
          <SelectItem id="IN_PROGRESS">进行中</SelectItem>
          <SelectItem id="BLOCKED">阻塞</SelectItem>
          <SelectItem id="DONE">已完成</SelectItem>
          <SelectItem id="CANCELED">已取消</SelectItem>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-body-medium" id="report-blocked-label">
          阻塞条件
        </span>
        <Select
          name="blocked"
          aria-labelledby="report-blocked-label"
          defaultSelectedKey={filters.blocked ?? "ALL"}
        >
          <SelectItem id="ALL">全部</SelectItem>
          <SelectItem id="YES">包含阻塞任务</SelectItem>
          <SelectItem id="NO">不含阻塞任务</SelectItem>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-body-medium" id="report-type-label">
          报告类型
        </span>
        <Select
          name="type"
          aria-labelledby="report-type-label"
          defaultSelectedKey={filters.type ?? "ALL"}
        >
          <SelectItem id="ALL">全部类型</SelectItem>
          <SelectItem id="DAILY">日报</SelectItem>
          <SelectItem id="WEEKLY">周报</SelectItem>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-body-medium" id="report-status-label">
          报告状态
        </span>
        <Select
          name="status"
          aria-labelledby="report-status-label"
          defaultSelectedKey={filters.status ?? "ALL"}
        >
          <SelectItem id="ALL">全部状态</SelectItem>
          <SelectItem id="DRAFT">本人草稿</SelectItem>
          <SelectItem id="SUBMITTED">已提交</SelectItem>
        </Select>
      </div>
      <Button type="submit">查询</Button>
      <ButtonLink href="/reports" variant="ghost">
        重置
      </ButtonLink>
    </form>
  );
}

