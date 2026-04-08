# Codex Realtime Board

一个面向 `Codex CLI` 的实时 companion panel 项目。

当前方向：做一个按需展开的侧栏式看板，不改动原生 `codex` 工作流，在需要时额外提供工具透明度、过程状态和上下文预算可视化。

## 当前状态

- 已完成产品方向和 V1 边界收敛。
- 已确认优先走 `Codex app-server` 协议，而不是解析终端字符流。
- 已初始化 `pnpm workspace + TypeScript` monorepo 骨架。
- `launcher`、`bridge`、`panel` 当前仍是最小占位实现，尚未接入真实协议链路。

## 仓库结构

```text
.
├─ apps/
│  ├─ cli/      # codex-board 命令入口
│  ├─ bridge/   # 本地 bridge / cache 占位服务
│  └─ panel/    # companion panel Web UI
├─ packages/
│  └─ shared/   # 共享类型、V1 数据模型、跨端常量
└─ docs/
   ├─ design/   # 产品与架构设计文档
   └─ superpowers/plans/
```

## 快速开始

```bash
corepack pnpm install
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

- 设计文档：`docs/design/2026-04-06-codex-realtime-board-v1-design.md`
- 骨架计划：`docs/superpowers/plans/2026-04-08-bootstrap-monorepo-skeleton.md`
