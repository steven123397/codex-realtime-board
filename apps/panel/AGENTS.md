# AGENTS.md

## 适用范围

本文件适用于 `apps/panel/` 子树。

## 当前职责

`apps/panel/` 负责消费 bridge 的归一化状态，并把它呈现为面向 `Codex CLI` 的 companion panel。当前职责包括：

- 通过 `api.ts` 读取 bridge 快照
- 通过 `panelState.ts` 组装 demo fallback、衍生状态和时间线数据
- 通过 `App.tsx` 与样式层展示 Overview / Tools / Search / Skills / Memories / Context 视图
- 在 bridge 不可用、session 未选定或目标会话异常时提供明确可解释的 UI 状态

## 局部开发约定

- 数据入口优先走 `api.ts` 和 `panelState.ts`；不要在组件内部直接发请求、拼协议字段或手写推断逻辑。
- panel 只消费 bridge 暴露的共享合同，不直接绑定 `Codex app-server` 原始事件结构。
- demo fallback 只用于 bridge 不可用或无真实快照可展示的场景；如果变成默认主路径，必须先回到设计和状态文档说明原因。
- 涉及目标 session 切换、URL 参数、空态或错误态时，先收口数据语义，再做视觉表达，避免把会话状态散落在多个组件中。
- 视觉改动如果改变了信息层级、主交互或空态语义，要同步更新设计或状态文档；纯样式微调则按实际收益处理。

## 验证建议

- `corepack pnpm --filter @codex-realtime-board/panel test`
- `corepack pnpm --filter @codex-realtime-board/panel typecheck`
- `corepack pnpm build`
