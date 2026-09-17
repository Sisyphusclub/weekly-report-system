import { expect, it } from "vitest";
import { mentionedUsernames } from "../src/lib/comment-input";
import { externalLinkInput } from "../src/lib/external-link-input";
import { taskImportBatch } from "../src/lib/task-import-input";

it("提及用户名去重并统一小写", () => {
  expect(mentionedUsernames("@Alice 请看 @alice 和 @ab")).toEqual(["alice"]);
});
it("外部链接必须是合法 URL", () => {
  expect(
    externalLinkInput.safeParse({
      taskId: "bad",
      title: "文档",
      url: "https://example.com",
    }).success,
  ).toBe(true);
  expect(
    externalLinkInput.safeParse({
      taskId: "bad",
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
