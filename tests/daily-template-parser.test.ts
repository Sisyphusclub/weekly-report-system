import { expect, it } from "vitest";
import { parseDailyTemplate } from "../src/lib/daily-template-parser";

it("解析日报日期、人员、计划和显式标注", () => {
  const result = parseDailyTemplate(
    `## 2026-09-18\n汇报人：于继鹏\n1、接口联调（已完成）｜类型：开发｜产出：接口5个 用例2条\n工作计划\n1、数据库迁移（未开始）｜类型：部署运维`,
  );
  expect(result.date).toBe("2026-09-18");
  expect(result.reporters[0].items[0]).toMatchObject({
    type: "开发",
    pending: false,
  });
  expect(result.reporters[0].items[0].outputs).toEqual([
    { label: "接口", quantity: 5, unit: "个" },
    { label: "用例", quantity: 2, unit: "条" },
  ]);
  expect(result.reporters[0].plans[0]).toMatchObject({
    type: "部署运维",
    pending: true,
  });
});

it("无类型时按命中关键词数量自动归类", () => {
  const result = parseDailyTemplate(
    "## 2026-09-18\n汇报人：李雪\n1、接口性能压测（进行中）",
  );
  expect(result.reporters[0].items[0]).toMatchObject({
    type: "测试",
    pending: true,
  });
});

it("兼容英文句点和计划别名", () => {
  const result = parseDailyTemplate(
    "## 2026-09-18\n汇报人：张三\n工作安排\n1. 需求梳理（未开始）",
  );
  expect(result.reporters[0].plans).toHaveLength(1);
});
