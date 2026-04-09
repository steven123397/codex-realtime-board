# 主线状态

## 关联文档

- 相关设计：`../design/2026-04-06-codex-realtime-board-v1-design.md`
- 当前计划：`../plan/2026-04-08-start-attach-orchestration.md`
- 已完成计划：`../plan/history_plan.md#2026-04-08-bootstrap-monorepo-skeleton`

## 目标 / 主题

本文档跟踪 Codex Realtime Board 当前主线的工程状态。当前目标是在保持 `Codex CLI` 为主工作面的前提下，稳住 `bridge` 的状态归一化合同、panel 的消费入口，以及后续 `start` / `attach` 编排所需的结构边界。

## 当前状态

当前已经稳定成立的事实包括：

- 已落地 `pnpm workspace + TypeScript` monorepo 骨架，以及 `apps/cli`、`apps/bridge`、`apps/panel`、`packages/shared` 四个主模块边界。
- `packages/shared` 已承载 `V1_PRIMARY_TABS`、会话摘要、工具卡片、搜索卡片、记忆引用、上下文预算和 bridge 健康快照等基础合同。
- `apps/bridge` 已具备 mock / live 双路径、`app-server` WebSocket transport、初始化请求客户端、状态归一化 store，以及 `/healthz`、`/api/state` HTTP 接口。
- `apps/panel` 已以 bridge snapshot 作为主数据源，bridge 不可用时会回退到 demo state，并已接通首版 Overview / Tabs 面板壳层。
- `apps/cli` 当前仍未完成真实编排链路，但下一轮活跃计划已经收口到 `../plan/2026-04-08-start-attach-orchestration.md`。
- 当前门禁已经覆盖 bridge client、bridge state、HTTP API，以及 panel 的数据加载与衍生状态。

## 关键历史节点

- `2026-04-06`：完成 `V1` 产品方向与设计边界收敛，并明确优先消费 `Codex app-server` 结构化事件。
- `2026-04-08`：完成 `pnpm workspace + TypeScript` monorepo 骨架初始化。
- `2026-04-08`：接通 `bridge` 的实时状态接口与 `panel` 的 snapshot 消费路径，形成首条真实 `bridge -> panel` 主链路。
- `2026-04-08`：完成文档治理体系接入，正式建立 `background / design / plan / status + AGENTS.md` 的维护规则。

## 当前仍然有效的风险 / 限制

- `apps/cli` 尚未真正拉起 bridge、打开 panel 或管理 board-managed session，`start` / `attach` 仍停留在占位级行为。
- `apps/panel` 当前只做一次性快照加载，还没有增量刷新、实时订阅、会话切换或更完整的交互层。
- `apps/bridge` 当前更偏单会话原型，活跃 / 最近会话索引、恢复策略和多会话管理尚未完善。
- `Codex app-server` 协议仍带实验性质，后续仍需持续防守事件名和字段形态的演进风险。

## 下一步

1. 推进 `apps/cli` 的 `start` / `attach` 编排，把 bridge、panel 和受管会话真正串起来。
2. 继续稳住 `apps/bridge` 的 live 会话接入、会话索引和状态归一化边界，补最小回归。
3. 让 `apps/panel` 从一次性 snapshot 加载逐步演进到更实时的 companion 视图，同时继续保持“只消费 bridge 合同”的结构边界。

## 验证基线

- `corepack pnpm test`
- `corepack pnpm typecheck`
- `corepack pnpm build`
