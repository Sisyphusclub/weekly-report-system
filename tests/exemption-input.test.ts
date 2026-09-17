import { expect, it } from "vitest";
import { exemptionInput } from "../src/lib/exemption-input";
const input = {
  userId: "employee",
  startDate: "2026-09-18",
  endDate: "2026-09-18",
  reason: " 请假 ",
};
it("支持单日和跨月免报并清理原因空白", () => {
  expect(exemptionInput.parse(input).reason).toBe("请假");
  expect(
    exemptionInput.safeParse({ ...input, endDate: "2026-10-02" }).success,
  ).toBe(true);
});
it.each([
  { userId: " " },
  { endDate: "2026-09-17" },
  { endDate: "2026-02-30" },
  { reason: " " },
  { reason: "长".repeat(501) },
])("拒绝无效免报记录：%j", (changes) => {
  expect(exemptionInput.safeParse({ ...input, ...changes }).success).toBe(
    false,
  );
});
