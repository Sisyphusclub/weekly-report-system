import { expect, it } from "vitest";
import { revisionInput } from "../src/lib/revision-input";
const value = {
  reportId: "00000000-0000-4000-8000-000000000001",
  version: 1,
  reason: " 更正表述 ",
  summary: "更新总结",
};
it("修订必须注明原因与基础版本", () => {
  expect(revisionInput.parse(value).reason).toBe("更正表述");
  expect(revisionInput.safeParse({ ...value, reason: " " }).success).toBe(
    false,
  );
  expect(revisionInput.safeParse({ ...value, version: 0 }).success).toBe(false);
});
it("限制修订内容长度", () => {
  expect(
    revisionInput.safeParse({ ...value, summary: "长".repeat(10001) }).success,
  ).toBe(false);
});
