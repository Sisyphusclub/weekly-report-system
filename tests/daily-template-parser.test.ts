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

it("显式类型优先于正文关键词", () => {
  const result = parseDailyTemplate(
    "## 2026-09-18\n汇报人：张三\n1、接口压测记录整理（已完成）｜类型：需求",
  );
  expect(result.reporters[0].items[0].type).toBe("需求");
});

it("同分时按类型约定顺序归类", () => {
  const result = parseDailyTemplate(
    "## 2026-09-18\n汇报人：张三\n1、需求测试方案（已完成）",
  );
  expect(result.reporters[0].items[0].type).toBe("需求");
});

it("拒绝不存在的日期", () => {
  expect(() =>
    parseDailyTemplate("## 2026-02-30\n汇报人：张三\n1、日报整理（已完成）"),
  ).toThrow("日报日期无效");
});

it("解析小数和多种产出单位", () => {
  const result = parseDailyTemplate(
    "## 2026-09-18\n汇报人：张三\n1、方案整理（已完成）｜产出：方案1.5套 文档2份",
  );
  expect(result.reporters[0].items[0].outputs).toEqual([
    { label: "方案", quantity: 1.5, unit: "套" },
    { label: "文档", quantity: 2, unit: "份" },
  ]);
});
