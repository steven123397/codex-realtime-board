# 主线状态

## 关联文档

- 相关设计：`../design/2026-04-06-codex-realtime-board-v1-design.md`
- 最新完成计划：`../plan/history_plan.md#2026-04-09-launcher-lifecycle-orchestration`
- 上一轮完成计划：`../plan/history_plan.md#2026-04-08-start-attach-orchestration`
- 更早完成计划：`../plan/history_plan.md#2026-04-08-bootstrap-monorepo-skeleton`

## 目标 / 主题

本文档跟踪 Codex Realtime Board 当前主线的工程状态。当前目标是在保持 `Codex CLI` 为主工作面的前提下，稳住 `bridge` 的状态归一化与控制合同、panel 的会话化消费入口，以及 `start` / `attach` 主链路之后的下一轮稳定化工作。

## 当前状态

当前已经稳定成立的事实包括：

- 已落地 `pnpm workspace + TypeScript` monorepo 骨架，以及 `apps/cli`、`apps/bridge`、`apps/panel`、`packages/shared` 四个主模块边界。
- `packages/shared` 已承载 `V1_PRIMARY_TABS`、会话摘要、工具卡片、搜索卡片、记忆引用、上下文预算、bridge 健康快照，以及 `start / attach` 所需的会话管理合同与 panel 查询参数常量。
- `apps/bridge` 已具备 mock / live 双路径、`app-server` WebSocket transport、多会话状态归一化、board-managed session registry，以及 `/healthz`、`/api/sessions`、`/api/state`、`/api/session/start`、`/api/session/attach` 控制出口。
- `apps/cli` 已从占位输出推进到真实控制路径：会先确保本地 `app-server`、bridge 和 panel 运行时可用，再通过 bridge 控制面执行 `start` / `attach`，并输出目标 panel URL。
- `apps/panel` 已能根据 URL 中的目标 `sessionId` 与 `bridgeUrl` 读取指定快照；bridge 不可用时回退 demo state，目标会话缺失或未选定时转为明确空态。
- 当前门禁已经覆盖 shared 合同、bridge session registry / control API、CLI orchestrator、launcher 运行时编排，以及 panel 的按会话加载与衍生状态。

## 关键历史节点

- `2026-04-06`：完成 `V1` 产品方向与设计边界收敛，并明确优先消费 `Codex app-server` 结构化事件。
- `2026-04-08`：完成 `pnpm workspace + TypeScript` monorepo 骨架初始化。
- `2026-04-08`：接通 `bridge` 的实时状态接口与 `panel` 的 snapshot 消费路径，形成首条真实 `bridge -> panel` 主链路。
- `2026-04-08`：完成文档治理体系接入，正式建立 `background / design / plan / status + AGENTS.md` 的维护规则。
- `2026-04-09`：完成 `start / attach` 主线实现，打通 `CLI -> bridge control API -> session registry -> panel target session` 这条最小可用编排链路。
- `2026-04-09`：完成 launcher 生命周期收口的首轮实现，`codex-board` 会按顺序确保 `app-server -> bridge -> panel` 三类本地运行时。

## 当前仍然有效的风险 / 限制

- launcher 当前只负责“确保可用并按需拉起”，还没有持久化 runtime manifest、PID 管理或统一清理旧进程。
- `attach` 的多会话选择当前仍是“列出 active / recent 后，通过 `codex-board attach <session-id>` 明确目标”的最小形态，还不是完整交互式选择器。
- `apps/panel` 当前仍以一次性快照加载为主，还没有增量刷新、实时订阅或运行中的会话切换体验。
- `Codex app-server` 协议仍带实验性质，后续仍需持续防守事件名和字段形态的演进风险。

## 下一步

1. 把 `attach` 从显式 `session-id` 选择推进到更顺手的交互式选择器或会话总览入口。
2. 让 `apps/panel` 从一次性 snapshot 加载逐步演进到更实时的 companion 视图，同时继续保持“只消费 bridge 合同”的结构边界。
3. 评估 launcher runtime manifest、端口冲突处理和进程清理策略，避免本地残留进程带来歧义。

## 验证基线

- `corepack pnpm test`
- `corepack pnpm typecheck`
- `corepack pnpm build`
