import { z } from "zod";
import { dateInput } from "@/lib/daily-input";

export const dailyWorkType = z.enum([
  "计划",
  "需求",
  "测试",
  "部署运维",
  "数据算法",
  "开发",
  "设计",
  "会议协作",
  "综合事务",
  "其他",
]);
export type DailyWorkType = z.infer<typeof dailyWorkType>;
export type DailyOutput = { label: string; quantity: number; unit: string };
export type DailyParsedItem = {
  content: string;
  status: string | null;
  pending: boolean;
  type: DailyWorkType;
  outputs: DailyOutput[];
};
export type DailyParsedReporter = {
  name: string;
  items: DailyParsedItem[];
  plans: DailyParsedItem[];
};
export type DailyParsedDocument = {
  date: string;
  reporters: DailyParsedReporter[];
};

const keywords: Array<[DailyWorkType, string[]]> = [
  [
    "需求",
    [
      "需求",
      "产品",
      "原型",
      "方案",
      "调研",
      "分析",
      "文档",
      "评审",
      "梳理",
      "规格",
      "用户故事",
      "可行性",
      "立项",
      "策划",
    ],
  ],
  [
    "测试",
    [
      "测试",
      "用例",
      "缺陷",
      "bug",
      "回归",
      "验收",
      "冒烟",
      "压测",
      "复现",
      "校验",
      "校对",
      "质量",
      "异常场景",
      "边界",
      "兼容性",
    ],
  ],
  [
    "部署运维",
    [
      "部署",
      "上线",
      "运维",
      "服务器",
      "环境",
      "发布",
      "配置",
      "迁移",
      "监控",
      "日志",
      "容器",
      "数据库",
      "备份",
      "扩容",
      "表结构",
      "正式服",
    ],
  ],
  [
    "数据算法",
    [
      "算法",
      "模型",
      "训练",
      "标注",
      "报表",
      "统计",
      "埋点",
      "指标",
      "数仓",
      "ETL",
      "AI",
      "智能体",
      "大模型",
      "数据同步",
    ],
  ],
  [
    "开发",
    [
      "开发",
      "编码",
      "接口",
      "API",
      "联调",
      "前端",
      "后端",
      "重构",
      "优化",
      "修复",
      "发版",
      "组件",
      "脚本",
      "集成",
      "功能",
      "模块",
      "字段",
    ],
  ],
  [
    "设计",
    [
      "设计",
      "UI",
      "原型图",
      "视觉",
      "切图",
      "样式",
      "界面",
      "版式",
      "效果图",
      "渲染",
      "demo",
    ],
  ],
  [
    "会议协作",
    [
      "会议",
      "评审会",
      "周会",
      "沟通",
      "对接",
      "协调",
      "培训",
      "分享",
      "汇报",
      "协同",
    ],
  ],
  [
    "综合事务",
    [
      "日报",
      "对账",
      "考勤",
      "请假",
      "文档整理",
      "行政",
      "招聘",
      "报销",
      "采购",
      "合同",
      "标书",
      "流程",
      "审核",
      "归档",
    ],
  ],
];
const pendingWords = [
  "待",
  "跟进",
  "进行中",
  "暂停",
  "搁置",
  "延期",
  "未开展",
  "未开始",
];
const doneWords = ["完成", "已完成"];

function classify(content: string, explicit?: string): DailyWorkType {
  if (explicit && dailyWorkType.safeParse(explicit).success)
    return explicit as DailyWorkType;
  let best: DailyWorkType = "其他";
  let score = 0;
  for (const [type, words] of keywords) {
    const hits = words.reduce(
      (total, word) =>
        total + (content.toLowerCase().includes(word.toLowerCase()) ? 1 : 0),
      0,
    );
    if (hits > score) {
      best = type;
      score = hits;
    }
  }
  return best;
}

function parseOutputs(value: string): DailyOutput[] {
  const result: DailyOutput[] = [];
  const pattern = /([^\s｜]+?)(\d+(?:\.\d+)?)([^\s｜]+)/g;
  for (const match of value.matchAll(pattern)) {
    result.push({
      label: match[1],
      quantity: Number(match[2]),
      unit: match[3],
    });
  }
  return result;
}

function parseItem(line: string): DailyParsedItem | null {
  const match = line.match(/^\s*\d+[、.]\s*(.+)$/);
  if (!match) return null;
  const parts = match[1]
    .split("｜")
    .map((part) => part.trim())
    .filter(Boolean);
  const content = parts[0];
  const statusMatch = content.match(/[（(]([^）)]+)[）)]/);
  const status = statusMatch?.[1] ?? null;
  const explicitType = parts
    .find((part) => part.startsWith("类型："))
    ?.slice(3)
    .trim();
  const outputText = parts
    .find((part) => part.startsWith("产出："))
    ?.slice(3)
    .trim();
  return {
    content: content.replace(/[（(][^）)]+[）)]/, "").trim(),
    status,
    pending: status
      ? pendingWords.some((word) => status.includes(word))
      : !doneWords.some((word) => status?.includes(word) ?? false),
    type: classify(content, explicitType),
    outputs: outputText ? parseOutputs(outputText) : [],
  };
}

export function parseDailyTemplate(input: string): DailyParsedDocument {
  const lines = input
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim());
  const date = lines
    .find((line) => /^##\s+\d{4}-\d{2}-\d{2}$/.test(line))
    ?.slice(3);
  if (!date) throw new Error("缺少日报日期");
  if (!dateInput.safeParse(date).success) throw new Error("日报日期无效");
  const reporters: DailyParsedReporter[] = [];
  let current: DailyParsedReporter | undefined;
  let inPlans = false;
  for (const line of lines) {
    const reporter = line.match(/^汇报人：(.+)$/)?.[1]?.trim();
    if (reporter) {
      current = { name: reporter, items: [], plans: [] };
      reporters.push(current);
      inPlans = false;
      continue;
    }
    if (/^(工作计划|明日计划|下周计划|工作安排|下阶段工作)$/.test(line)) {
      inPlans = true;
      continue;
    }
    if (!current) continue;
    const item = parseItem(line);
    if (item) (inPlans ? current.plans : current.items).push(item);
  }
  if (!reporters.length) throw new Error("缺少汇报人");
  return { date, reporters };
}
