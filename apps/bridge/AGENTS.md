# AGENTS.md

## 适用范围

本文件适用于 `apps/bridge/` 子树。

## 当前职责

`apps/bridge/` 负责把 `Codex app-server` 的底层协议事件收口为 panel 可消费的产品语义。当前职责包括：

- `appServerProtocol`、`appServerClient`、`websocketTransport` 这条底层协议接入链路
- live / mock 两类 bridge 运行时来源
- `bridgeState` 的归一化状态与派生视图
- `/healthz`、`/api/state`、`/api/state/sync` 以及后续控制 API 的 HTTP 出口
- board-managed session 的活跃 / 最近会话索引与恢复入口

## 局部开发约定

- 先把原始协议细节限制在 `appServer*`、transport 和 live 运行时附近；不要把底层事件结构直接扩散到 HTTP 响应或 panel 消费层。
- 对外合同优先收口到 `packages/shared/`；bridge 内部状态可以更细，但对外返回前必须转换成共享合同。
- `mock` 路径不是临时脚手架，而是 panel 和文档演示的重要保底路径；修改 live 行为时，评估 mock 是否也需要同步更新。
- 新增控制 API 时，先想清楚“桥接控制面”和“状态读取面”的边界，不要把副作用操作塞进只读接口。
- 涉及 session registry、恢复策略、多会话索引时，优先保证状态机清晰和错误路径可测，不要先做过度 UI 化的返回格式。
- 继续推进 panel 的增量刷新路径时，优先从 bridge 侧增加 cursor / conditional sync 这类只读合同，不要让 panel 直接跨过 bridge 去消费底层事件流。

## 验证建议

- `corepack pnpm --filter @codex-realtime-board/bridge test`
- `corepack pnpm typecheck`
- 如果修改了对外 HTTP 合同，再跑 `corepack pnpm build`
