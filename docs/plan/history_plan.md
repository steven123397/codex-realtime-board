# 历史计划归档

本文件用于归档已经完成、且不再保留为活跃计划的实现计划。

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
