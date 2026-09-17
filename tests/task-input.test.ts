import { expect, it } from "vitest";
import { taskInput } from "../src/lib/task-input";
const base = {
  version: 0,
  projectId: "p",
  categoryId: "c",
  primaryAssigneeId: "u",
  content: "整理活动素材",
  kind: "ACTUAL",
  status: "TODO",
  workDate: "2026-09-18",
  dueDate: null,
  sourceTaskId: null,
};
it("计划必须有截止日期", () => {
  expect(taskInput.safeParse({ ...base, kind: "PLAN" }).success).toBe(false);
  expect(
    taskInput.safeParse({ ...base, kind: "PLAN", dueDate: "2026-09-20" })
      .success,
  ).toBe(true);
});
it("新任务使用零版本，更新使用正版本", () => {
  expect(taskInput.safeParse({ ...base, version: 1 }).success).toBe(false);
  expect(
    taskInput.safeParse({
      ...base,
      id: "00000000-0000-4000-8000-000000000001",
      version: 1,
    }).success,
  ).toBe(true);
});
