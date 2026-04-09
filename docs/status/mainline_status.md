# 主线状态

## 关联文档

- 相关设计：`../design/2026-04-06-codex-realtime-board-v1-design.md`
- 最新完成计划：`../plan/history_plan.md#2026-04-09-attach-interactive-selector`
- 上一轮完成计划：`../plan/history_plan.md#2026-04-09-launcher-lifecycle-orchestration`
- 更早完成计划：`../plan/history_plan.md#2026-04-08-start-attach-orchestration`
- 更早历史计划：`../plan/history_plan.md#2026-04-08-bootstrap-monorepo-skeleton`

## 目标 / 主题

本文档跟踪 Codex Realtime Board 当前主线的工程状态。当前目标是在保持 `Codex CLI` 为主工作面的前提下，稳住 `bridge` 的状态归一化与控制合同、panel 的会话化消费入口，以及 `start` / `attach` 主链路之后的下一轮稳定化工作。

## 当前状态

当前已经稳定成立的事实包括：

- 已落地 `pnpm workspace + TypeScript` monorepo 骨架，以及 `apps/cli`、`apps/bridge`、`apps/panel`、`packages/shared` 四个主模块边界。
- `packages/shared` 已承载 `V1_PRIMARY_TABS`、会话摘要、工具卡片、搜索卡片、记忆引用、上下文预算、bridge 健康快照，以及 `start / attach` 所需的会话管理合同与 panel 查询参数常量。
- `apps/bridge` 已具备 mock / live 双路径、`app-server` WebSocket transport、多会话状态归一化、board-managed session registry，以及 `/healthz`、`/api/sessions`、`/api/state`、`/api/state/sync`、`/api/session/start`、`/api/session/attach` 控制出口。
- `apps/cli` 已从占位输出推进到真实控制路径：会先确保本地 `app-server`、bridge 和 panel 运行时可用，再通过 bridge 控制面执行 `start` / `attach`，并输出目标 panel URL。
- `apps/cli` 的 `attach` 当前已具备最小交互式选择器：多 active 或 recent 回退时，会在终端里列出编号并允许直接选择目标会话。
- `apps/panel` 已能根据 URL 中的目标 `sessionId` 与 `bridgeUrl` 轮询指定快照，并同步读取 `/api/sessions` 暴露运行中会话目录；当前会优先通过 `/api/state/sync` 进行 cursor 条件同步，在无变化场景下避免重复搬运整份 snapshot，同时保留最近同步时间、手动刷新、stale / reconnect 反馈，以及运行中会话切换。bridge 完全不可用时回退 demo state，目标会话缺失或未选定时转为明确空态。
- 当前门禁已经覆盖 shared 合同、bridge session registry / control API、CLI orchestrator、launcher 运行时编排，以及 panel 的按会话加载与衍生状态。

## 关键历史节点

- `2026-04-06`：完成 `V1` 产品方向与设计边界收敛，并明确优先消费 `Codex app-server` 结构化事件。
- `2026-04-08`：完成 `pnpm workspace + TypeScript` monorepo 骨架初始化。
- `2026-04-08`：接通 `bridge` 的实时状态接口与 `panel` 的 snapshot 消费路径，形成首条真实 `bridge -> panel` 主链路。
- `2026-04-08`：完成文档治理体系接入，正式建立 `background / design / plan / status + AGENTS.md` 的维护规则。
- `2026-04-09`：完成 `start / attach` 主线实现，打通 `CLI -> bridge control API -> session registry -> panel target session` 这条最小可用编排链路。
- `2026-04-09`：完成 launcher 生命周期收口的首轮实现，`codex-board` 会按顺序确保 `app-server -> bridge -> panel` 三类本地运行时。
- `2026-04-09`：完成 `attach` 交互式选择器的首轮实现，多会话场景下可直接在终端按编号选择目标会话。
- `2026-04-09`：完成 panel 首轮实时化，把一次性 snapshot 加载推进到 bridge 轮询 + 手动刷新视图。
- `2026-04-09`：完成 panel 第二轮实时化，把 stale / reconnect 反馈、运行中会话切换与 session directory 读取补齐到 companion 视图。
- `2026-04-09`：完成 bridge 条件同步合同的首轮实现，新增 `/api/state/sync` cursor 端点，并让 panel 优先走这条增量刷新路径。

## 当前仍然有效的风险 / 限制

- launcher 当前只负责“确保可用并按需拉起”，还没有持久化 runtime manifest、PID 管理或统一清理旧进程。
- `attach` 选择器当前仍是最小终端交互：支持一次编号 / session id 选择，但还没有方向键导航、分页或更丰富的筛选能力。
- `apps/panel` 当前虽然已经接入 bridge 侧 cursor 条件同步，但返回体仍是“unchanged 或完整 snapshot”两档，还没有真正的 delta / push 形态增量合同。
- `Codex app-server` 协议仍带实验性质，后续仍需持续防守事件名和字段形态的演进风险。

## 下一步

1. 在已有 `/api/state/sync` cursor 条件同步的基础上，继续评估更细粒度的 delta / SSE / WebSocket 升级，但仍保持 panel 只消费 bridge 合同而不直连底层协议。
2. 评估 launcher runtime manifest、端口冲突处理和进程清理策略，避免本地残留进程带来歧义。
3. 继续增强 `attach` 选择器的可用性，例如重试、筛选和更完整的会话总览入口。

## 验证基线

- `corepack pnpm test`
- `corepack pnpm typecheck`
- `corepack pnpm build`
