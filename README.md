# Codex Realtime Board

一个面向 `Codex CLI` 的实时 companion panel 原型。

当前方向：做一个按需展开的侧栏式看板，不改动原生 `codex` 工作流，在需要时额外提供工具透明度、过程状态和上下文预算可视化。

## 当前状态

- 已完成产品方向和 `V1` 边界收敛。
- 已确认优先走 `Codex app-server` 协议，而不是解析终端字符流。
- 已落地 `pnpm workspace + TypeScript` monorepo 与共享数据模型骨架。
- `apps/bridge` 已具备 mock / live 双路径、board-managed session registry、`/api/sessions`、`/api/state`、`/api/session/start`、`/api/session/attach` 和多会话状态归一化能力。
- `apps/panel` 已能按目标 `sessionId` 消费 bridge snapshot；bridge 不可用时回退到 demo state，会话缺失或未选定时进入明确空态。
- `apps/cli` 已能通过 bridge 控制面执行 `codex-board start` / `codex-board attach`，并输出目标 panel URL。

## 仓库结构

```text
.
├─ apps/
│  ├─ cli/        # codex-board 命令入口与后续编排逻辑
│  ├─ bridge/     # 本地 bridge / cache service
│  └─ panel/      # companion panel Web UI
├─ packages/
│  └─ shared/     # 共享类型、V1 数据模型、跨端常量
└─ docs/
   ├─ background/ # 项目背景与路线原因
   ├─ design/     # 产品与结构设计文档
   ├─ plan/       # 活跃计划与历史归档
   └─ status/     # 当前主线状态与风险
```

## 快速开始

```bash
corepack pnpm install
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
```

常用开发命令：

```bash
corepack pnpm dev:cli
corepack pnpm dev:bridge
corepack pnpm dev:panel
```

当前最小控制链路：

```bash
# 需要先准备 app-server（如果要走 live 路径）
export CODEX_APP_SERVER_URL=ws://127.0.0.1:3918

# 启动一个新的 board-managed session
corepack pnpm --filter @codex-realtime-board/cli dev -- start "Summarize the current workspace"

# 查看并附着到已有 managed session
corepack pnpm --filter @codex-realtime-board/cli dev -- attach
corepack pnpm --filter @codex-realtime-board/cli dev -- attach <session-id>
```

## 文档

- 文档入口：`docs/index.md`
- 主线状态：`docs/status/mainline_status.md`
- `V1` 设计文档：`docs/design/2026-04-06-codex-realtime-board-v1-design.md`
- 历史计划归档：`docs/plan/history_plan.md`
