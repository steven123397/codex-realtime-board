# Codex Realtime Board

一个面向 `Codex CLI` 的实时 companion panel 原型。

当前方向：做一个按需展开的侧栏式看板，不改动原生 `codex` 工作流，在需要时额外提供工具透明度、过程状态和上下文预算可视化。

## 当前状态

- 已完成产品方向和 `V1` 边界收敛。
- 已确认优先走 `Codex app-server` 协议，而不是解析终端字符流。
- 已落地 `pnpm workspace + TypeScript` monorepo 与共享数据模型骨架。
- `apps/bridge` 已具备 mock / live 双路径、`/healthz`、`/api/state` 和最小状态归一化能力。
- `apps/panel` 已能消费 bridge snapshot，并在 bridge 不可用时回退到 demo state。
- `apps/cli` 当前仍是 `start` / `attach` 占位入口，完整 launcher / session 管理尚未落地。

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

## 文档

- 文档入口：`docs/index.md`
- 主线状态：`docs/status/mainline_status.md`
- `V1` 设计文档：`docs/design/2026-04-06-codex-realtime-board-v1-design.md`
- 当前活跃计划：`docs/plan/2026-04-08-start-attach-orchestration.md`
- 历史计划归档：`docs/plan/history_plan.md`
