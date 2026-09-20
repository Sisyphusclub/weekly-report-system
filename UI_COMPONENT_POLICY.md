# UI 组件来源政策

## 组件优先级

1. 优先使用本地 BEUI Pro 源码：`src/components/premium`、`src/components/motion`。
2. 本地没有时，从已授权的 BEUI Pro Registry 获取源码并纳入版本控制。
3. BEUI Pro 未覆盖的基础交互，使用 shadcn/Radix 组件方案后再放入共享组件目录。
4. 业务页面只组合共享组件，不依赖远程 Registry 运行时，也不复制组件内部实现。

## 禁止裸写

业务页面和业务表单不得直接渲染 `<button>`、`<input>`、`<select>`、`<textarea>`、`<dialog>` 或 `<table>`。上传文件这类浏览器专属能力也必须封装为共享的 `FileUploadButton` 等设计系统组件后使用。

共享组件内部可以使用原生 HTML 来提供正确的语义、表单提交和无障碍能力，但必须统一使用 Design Tokens，并覆盖默认、悬停、聚焦、禁用、加载、错误、空状态和响应式状态。

## 审计要求

新增基础控件前，先搜索 `src/components/premium`、`src/components/motion` 和 BEUI Pro Registry。每次 UI 改动完成后检查 `src/app` 与业务组件是否出现新的裸控件，并运行类型检查、Lint、测试和构建。
