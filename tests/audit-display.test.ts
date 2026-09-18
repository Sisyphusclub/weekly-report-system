import { expect, it } from "vitest";
import { auditActionLabel, auditReasonDetails } from "../src/lib/audit-display";

it("renders task transfer participants and reason without losing account IDs", () => {
  expect(
    auditReasonDetails(
      "TASK_TRANSFER",
      JSON.stringify({
        fromId: "disabled-user",
        toId: "new-owner",
        reason: "人员交接",
      }),
    ),
  ).toEqual([
    { label: "原负责人 ID", value: "disabled-user" },
    { label: "接收人 ID", value: "new-owner" },
    { label: "转交原因", value: "人员交接" },
  ]);
});
it.each([
  "legacy reason",
  "null",
  "{}",
  '{"fromId":3,"toId":"target","reason":"why"}',
])("preserves legacy or malformed reason %s", (reason) => {
  expect(auditReasonDetails("TASK_TRANSFER", reason)).toEqual([
    { label: "操作原因", value: reason },
  ]);
});
it("preserves recovery reasons as plain text", () => {
  expect(
    auditReasonDetails("OPS_TOTP_RESET", "设备丢失，已核实本人身份"),
  ).toEqual([{ label: "操作原因", value: "设备丢失，已核实本人身份" }]);
  expect(auditReasonDetails("OLD_ACTION", null)).toEqual([]);
});
it("keeps unknown event codes visible", () => {
  expect(auditActionLabel("TASK_STATUS_TODO_TO_IN_PROGRESS")).toBe(
    "任务状态：待开始 → 进行中",
  );
  expect(auditActionLabel("REPORT_SUBMIT")).toBe("提交日报");
  expect(auditActionLabel("TASK_TRANSFER")).toBe("批量转交任务");
  expect(auditActionLabel("FUTURE_EVENT")).toBe("FUTURE_EVENT");
});
