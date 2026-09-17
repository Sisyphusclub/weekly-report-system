import { expect, it } from "vitest";
import { deliverableInput } from "../src/lib/deliverable-input";
it("接受非负有限数量", () => {
  expect(
    deliverableInput.safeParse({
      taskId: "t",
      unitId: "u",
      quantity: 2,
      version: 1,
    }).success,
  ).toBe(true);
  expect(
    deliverableInput.safeParse({
      taskId: "t",
      unitId: "u",
      quantity: -1,
      version: 1,
    }).success,
  ).toBe(false);
  expect(
    deliverableInput.safeParse({
      taskId: "t",
      unitId: "u",
      quantity: Infinity,
      version: 1,
    }).success,
  ).toBe(false);
});
it("交付物写入必须携带任务版本", () => {
  expect(
    deliverableInput.safeParse({ taskId: "t", unitId: "u", quantity: 2 })
      .success,
  ).toBe(false);
});
