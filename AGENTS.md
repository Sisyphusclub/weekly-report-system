<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 文案约束

- 整个系统的用户可见文案保持简洁、自然、直接，优先说明当前状态、失败原因和下一步操作。
- 避免过多 AI 味道的解释性文案、模板化套话、夸张承诺、冗余免责声明和与任务无关的背景说明。
- 页面标题、按钮、提示、错误信息和空状态都应服务于当前操作；能用一句话说清楚时不要拆成多段解释。

## 产品与前端架构约束

- 始终以长期可维护的企业级 AI SaaS 产品为目标，遵循统一的 Design System，保持设计语言、交互方式和代码规范一致。
- 基础组件优先使用本项目的 beUI Pro 源码；交互能力优先基于 Radix UI Headless Components 实现，避免重复手写基础控件。
- 组件来源遵循固定优先级：先查本地 `src/components/premium` 与 `src/components/motion` 中的 BEUI Pro 源码，再查 BEUI Pro 私有 Registry；BEUI Pro 没有的基础能力使用 shadcn/Radix 方案，禁止在业务页面直接裸写基础控件。
- 业务页面不得直接平铺 `<button>`、`<input>`、`<select>`、`<textarea>`、`<dialog>`、`<table>` 等基础控件；允许共享设计系统组件内部使用原生 HTML 完成语义和可访问性。
- 页面采用简洁、专业、高信息密度和克制的企业级 AI SaaS 风格，可参考火山引擎控制台、飞书、Linear 和 Vercel。
- 颜色、字体、间距、圆角、阴影和动画统一使用 Design Tokens 管理，禁止在业务页面硬编码视觉值，并为后续主题切换保留扩展空间。
- 复杂表格和列表优先使用 TanStack Table 管理数据逻辑，图表优先使用 Recharts 或项目已有方案，动画统一使用 Motion。
- 开发前先检查已有基础组件和业务组件；重复出现的布局、交互和视觉样式应主动抽象沉淀，保持高内聚、低耦合和易扩展。
- 组件必须覆盖默认、悬停、激活、禁用、加载、空状态、异常状态和响应式布局等必要交互状态。

## Git 提交流程

- 每一次代码改动都必须提交 Git，不保留未提交的实现改动。
- 提交信息格式必须为 `feat: 中文说明` 或 `fix: 中文说明`；新增能力使用 `feat:`，修复问题使用 `fix:`。
