import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ProjectCollaborationBoard,
  type CollaborationProject,
} from "../src/components/dashboard/project-collaboration-board";

const project: CollaborationProject = {
  id: "project-1",
  name: "测试项目",
  completed: 3,
  inProgress: 2,
  blocked: 1,
  owner: { id: "owner-1", name: "张三" },
  members: [],
  nextPlans: [],
  deliverables: [],
};

describe("项目卡片进度", () => {
  it("显示各状态数量及可访问的进度比例条", () => {
    const html = renderToStaticMarkup(
      createElement(ProjectCollaborationBoard, { projects: [project] }),
    );

    expect(html).toContain("完成 3");
    expect(html).toContain("进行中 2");
    expect(html).toContain("阻塞 1");
    expect(html).toContain('aria-label="完成 3 项，进行中 2 项，阻塞 1 项"');
    expect(html).toContain("bg-chart-1");
    expect(html).toContain("bg-chart-3");
    expect(html).toContain("bg-destructive");
  });

  it("所有进度为零时不显示空白进度区域", () => {
    const html = renderToStaticMarkup(
      createElement(ProjectCollaborationBoard, {
        projects: [{ ...project, completed: 0, inProgress: 0, blocked: 0 }],
      }),
    );

    expect(html).toContain("测试项目");
    expect(html).not.toContain(
      'aria-label="完成 0 项，进行中 0 项，阻塞 0 项"',
    );
    expect(html).not.toContain('class="relative h-16 overflow-hidden"');
  });
});
