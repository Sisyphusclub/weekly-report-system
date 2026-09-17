import { expect, it } from "vitest";
import { projectInput } from "../src/lib/project-input";
const base = {
  version: 0,
  name: "市场活动",
  ownerId: "owner",
  memberIds: [],
  status: "PLANNED",
  startDate: null,
  targetEndDate: null,
};
it("允许尚未排定日期的项目", () => {
  expect(projectInput.safeParse(base).success).toBe(true);
});
it("拒绝倒置或不存在的日期", () => {
  expect(
    projectInput.safeParse({
      ...base,
      startDate: "2026-10-10",
      targetEndDate: "2026-10-01",
    }).success,
  ).toBe(false);
  expect(
    projectInput.safeParse({ ...base, startDate: "2026-02-30" }).success,
  ).toBe(false);
});
it("新建与修改使用不同版本约束", () => {
  expect(projectInput.safeParse({ ...base, version: 2 }).success).toBe(false);
  expect(
    projectInput.safeParse({
      ...base,
      id: "00000000-0000-4000-8000-000000000001",
    }).success,
  ).toBe(false);
});
