# AGENTS.md

## 适用范围

本文件适用于 `apps/` 子树下的全部运行时入口。

## 子系统边界

- `apps/cli/`
  `codex-board` 命令入口与后续 `start` / `attach` 编排逻辑。
- `apps/bridge/`
  本地 bridge / cache service，负责连接 `Codex app-server`、归一化事件、维护会话状态，并通过 HTTP 向 panel 暴露快照。
- `apps/panel/`
  companion panel 前端，负责消费 bridge 的归一化状态，不直接绑定底层 `app-server` 协议。

## 子目录 AGENTS 索引

- `apps/bridge/AGENTS.md`
  bridge 协议接入、状态归一化、控制 API 与会话索引的局部规则。
- `apps/panel/AGENTS.md`
  panel 数据入口、fallback 语义、session 切换与 UI 呈现的局部规则。

## 局部开发约定

- 涉及跨端数据结构、状态枚举、健康响应或主 Tab 常量时，优先修改 `packages/shared/`，不要在 `apps/` 内复制合同。
- `bridge` 的职责是把原始协议事件收口为稳定的产品语义；不要把底层协议细节直接泄漏到 panel。
- `panel` 应优先通过 `api.ts`、`panelState.ts` 等入口消费 bridge 状态，不要在组件内直接写协议推断逻辑。
- `panel` 的实时化优先沿 bridge snapshot + session directory + cursor 条件同步合同推进轮询 / stale / reconnect / 会话切换等能力，不直接跳到前端直连 `Codex app-server` 协议。
- 修改 `bridge` 或 `panel` 时，尽量保持 mock / live 双路径都还能工作，避免只顾一条路径。
- `cli` 当前已经接入 launcher 运行时编排、bridge 控制面和最小 attach 交互式选择器；后续继续推进 attach 体验或 runtime 管理策略时，要先更新设计和状态文档，再扩命令行为。

## 验证建议

- `bridge` 相关改动：`corepack pnpm --filter @codex-realtime-board/bridge test`
- `panel` 相关改动：`corepack pnpm --filter @codex-realtime-board/panel test`
- 跨 app 改动：`corepack pnpm typecheck` 与 `corepack pnpm build`
