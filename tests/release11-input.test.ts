import { expect, it } from "vitest";
import { mentionedUsernames } from "../src/lib/comment-input";
import { externalLinkInput } from "../src/lib/external-link-input";
import { taskImportBatch } from "../src/lib/task-import-input";
import { attachmentInput } from "../src/lib/attachment-input";

it("提及用户名去重并统一小写", () => {
  expect(mentionedUsernames("@Alice 请看 @alice 和 @ab")).toEqual(["alice"]);
});
it("外部链接必须是合法 URL", () => {
  expect(
    externalLinkInput.safeParse({
      taskId: "00000000-0000-4000-8000-000000000001",
      title: "文档",
      url: "https://example.com",
    }).success,
  ).toBe(true);
  expect(
    externalLinkInput.safeParse({
      taskId: "00000000-0000-4000-8000-000000000001",
      title: "文档",
      url: "javascript:alert(1)",
    }).success,
  ).toBe(false);
});
it("任务批量导入限制数量与内容", () => {
  expect(taskImportBatch.safeParse({ items: [] }).success).toBe(false);
  expect(
    taskImportBatch.safeParse({
      items: [
        {
          projectId: "p",
          categoryId: "c",
          primaryAssigneeId: "u",
          content: "任务",
          kind: "PLAN",
          status: "TODO",
          workDate: null,
          dueDate: "2026-09-18",
        },
      ],
    }).success,
  ).toBe(true);
});
it("附件校验类型、大小和 SHA-256", () => {
  const valid = {
    fileName: "a.pdf",
    contentType: "application/pdf",
    sizeBytes: 100,
    sha256: "a".repeat(64),
  };
  expect(attachmentInput.safeParse(valid).success).toBe(true);
  expect(
    attachmentInput.safeParse({ ...valid, contentType: "application/zip" })
      .success,
  ).toBe(false);
  expect(
    attachmentInput.safeParse({ ...valid, sizeBytes: 10 * 1024 * 1024 + 1 })
      .success,
  ).toBe(false);
  expect(attachmentInput.safeParse({ ...valid, sha256: "bad" }).success).toBe(
    false,
  );
});
