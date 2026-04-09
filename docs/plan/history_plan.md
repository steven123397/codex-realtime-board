# 历史计划归档

本文件用于归档已经完成、且不再保留为活跃计划的实现计划。

## 2026-04-09 sync-empty-state-contract

- 完成时间：2026-04-09
- 对应设计：`../design/2026-04-06-codex-realtime-board-v1-design.md`
- 完成内容：
  - 在共享合同中补齐 `state` / `sync` 读取面的空态错误语义，明确区分 `no_session_selected` 与 `session_not_found`。
  - 让 bridge 的 `/api/state` 与 `/api/state/sync` HTTP 返回体直接暴露这两类 typed 404，而不是统一压成模糊的 `session_not_found`。
  - 让 panel 在 `sync` 端点已经明确返回空态时直接收口到空视图，不再额外回退一轮完整 snapshot 请求。
- 过程摘要：
  - 这一轮没有直接跳到 delta / SSE，而是先把条件同步读路径的空态合同补齐，降低 panel 的多余回源并为后续增量升级打稳错误语义基础。

## 2026-04-08 start-attach-orchestration

- 完成时间：2026-04-09
- 对应设计：`../design/2026-04-06-codex-realtime-board-v1-design.md`
- 完成内容：
  - 在 `packages/shared` 中补齐 board-managed session 共享合同、active/recent 划分语义和 panel 查询参数常量。
  - 在 `apps/bridge` 中落地 session registry、`/api/sessions`、`/api/session/start`、`/api/session/attach` 与按 `sessionId` 读取快照的能力。
  - 在 `apps/cli` 中把 `start` / `attach` 从占位输出推进到真实控制路径，并补桥接可用性检查、面板 URL 打开与会话选择提示。
  - 在 `apps/panel` 中支持基于 URL 目标会话消费 bridge 快照，并在会话缺失或未选定时展示明确空态。
- 过程摘要：
  - 这一轮实现把 `CLI -> bridge control API -> session registry -> panel target session` 这条最小可用主链路打通；后续重点转向 app-server / panel 生命周期收口、attach 交互式选择与更实时的面板刷新。

## 2026-04-09 launcher-lifecycle-orchestration

- 完成时间：2026-04-09
- 对应设计：`../design/2026-04-06-codex-realtime-board-v1-design.md`
- 完成内容：
  - 在 `apps/cli` 中新增本地 runtime 配置、`app-server` / panel 进程管理器与统一 launcher 编排入口。
  - 让 `codex-board start` / `attach` 在执行会话控制前，按顺序确保 `app-server -> bridge -> panel` 三类本地运行时。
  - 保持 bridge live 模式启动参数由 launcher 统一传递，并补齐 CLI 侧的运行时编排测试。
- 过程摘要：
  - 这一轮把“尽量减少手动前置拉起本地进程”的目标推进到可用状态；后续重点转向 attach 交互式选择、panel 实时刷新，以及 runtime manifest / 进程清理策略。

## 2026-04-09 attach-interactive-selector

- 完成时间：2026-04-09
- 对应设计：`../design/2026-04-06-codex-realtime-board-v1-design.md`
- 完成内容：
  - 在 `apps/cli` 中新增最小 session selector，按 `Active / Recent` 分组输出稳定编号。
  - 让 `codex-board attach` 在多会话场景下支持交互式编号选择，不再要求用户重新手输一次 `session-id`。
  - 补齐 CLI 侧选择流程测试，并保持 attach 仍然只消费 bridge 暴露的会话列表与 attach 控制合同。
- 过程摘要：
  - 这一轮把 attach 从“静态提示”推进到“可直接选择”的最小可用体验；后续仍可继续增强重试、筛选和更完整的会话总览入口。

## 2026-04-08 bootstrap-monorepo-skeleton

- 完成时间：2026-04-08
- 对应设计：`../design/2026-04-06-codex-realtime-board-v1-design.md`
- 完成内容：
  - 初始化 `pnpm workspace + TypeScript` monorepo 骨架。
  - 落地 `apps/cli`、`apps/bridge`、`apps/panel` 与 `packages/shared` 的首版代码结构。
  - 建立 `bridge` 的 mock / live 状态来源、`/healthz` 与 `/api/state` HTTP 接口，以及围绕状态归一化的最小单测。
  - 让 `panel` 以 bridge snapshot 作为主数据入口，并保留 demo fallback。
- 过程摘要：
  - 原始计划文件创建于早期骨架阶段，后续实现已经超过“单纯初始化骨架”的范围，因此按完成态归档；当前实时状态以 `../status/mainline_status.md` 为准。
