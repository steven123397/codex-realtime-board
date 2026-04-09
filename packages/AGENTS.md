# AGENTS.md

## 适用范围

本文件适用于 `packages/` 子树。当前主要覆盖 `packages/shared/`。

## 当前职责

`packages/shared/` 是跨端共享合同的单一来源，负责维护：

- `bridge` 和 `panel` 共同消费的序列化数据模型
- 主 Tab 常量、状态枚举和最小公共类型
- bridge 健康检查等稳定对外合同

## 局部开发约定

- 优先放纯数据结构、常量和可序列化合同；不要把 Node.js、浏览器或协议传输逻辑塞进 shared。
- 新增字段时，优先考虑前后端都能稳定消费的命名和语义，避免只对单一宿主有意义的瞬时结构。
- 发生破坏性合同变化时，同步更新相关 `design/status` 文档以及 `apps/bridge`、`apps/panel` 的使用代码。
- 如果某个类型只被单个子系统内部使用，不要为了“看起来统一”而强行提升到 shared。

## 验证建议

- `corepack pnpm --filter @codex-realtime-board/shared build`
- `corepack pnpm typecheck`
