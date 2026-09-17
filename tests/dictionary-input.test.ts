import { expect, it } from "vitest";
import { dictionaryInput } from "../src/lib/dictionary-input";
const base = { kind: "category", name: "活动", enabled: true, sortOrder: 0 };
it("拒绝空名称和越界排序", () => {
  expect(dictionaryInput.safeParse({ ...base, name: "  " }).success).toBe(
    false,
  );
  expect(dictionaryInput.safeParse({ ...base, sortOrder: -1 }).success).toBe(
    false,
  );
});
it("修改已有字典项必须携带版本", () => {
  expect(dictionaryInput.safeParse(base).success).toBe(true);
  expect(
    dictionaryInput.safeParse({
      ...base,
      id: "00000000-0000-4000-8000-000000000001",
    }).success,
  ).toBe(false);
});
