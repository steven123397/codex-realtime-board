# Start / Attach 编排计划

> **文档状态：** 执行中

## 文档定位

本文档用于记录 `codex-board start` / `attach` 这条主链路如何从占位入口推进到最小可用实现，以及完成后需要如何回写状态文档并归档。

## 关联文档

- 来源设计：`../design/2026-04-06-codex-realtime-board-v1-design.md`
- 目标状态：`../status/mainline_status.md`

## 目标

- 把 `codex-board start` 从占位输出推进到“拉起本地 bridge、创建 board-managed session、把 panel 指向目标会话”的最小真实主路径。
- 把 `codex-board attach` 从占位输出推进到“查看 active / recent board-managed sessions，并附着到目标会话”的最小真实主路径。
- 在这轮实现中继续保持 `panel <- bridge <- app-server` 的分层边界，不让 panel 直接依赖底层协议。

## 完成定义

- `apps/cli` 不再只打印 placeholder，而能通过 bridge 控制面执行 `start` / `attach` 主路径。
- `apps/bridge` 具备 board-managed session 的最小索引与控制 API，能区分 active / recent 会话，并能为指定会话提供快照读取入口。
- `apps/panel` 能根据目标 session 标识读取对应快照，并在没有目标会话时维持可解释的空态或 fallback。
- `packages/shared` 收口编排过程中需要跨端复用的会话摘要、控制请求与响应合同。
- 至少补齐 CLI / bridge / panel 这条主链路对应的最小回归，并通过仓库基线验证。

## 任务

### 任务 1：收口 board-managed session 共享合同

**文件：**
- 创建：`packages/shared/src/sessionManagement.ts`
- 修改：`packages/shared/src/contracts.ts`
- 修改：`packages/shared/src/index.ts`
- 修改：`packages/shared/package.json`

- [ ] **步骤 1：定义 `start` / `attach` 编排需要的共享类型**
  在 shared 中收口 `ManagedSessionSummary`、`ManagedSessionListSnapshot`、`StartSessionRequest`、`StartSessionResult`、`AttachSessionRequest`、`AttachSessionResult` 等跨端合同，避免 CLI、bridge、panel 各自发明一套结构。
- [ ] **步骤 2：明确 active / recent / selected session 的命名和语义边界**
  确保会话是否受管理、是否活跃、最后活跃时间、展示标题、panel 路由参数等字段都由 shared 统一定义。
- [ ] **步骤 3：补共享合同的最小消费校验**
  至少让 bridge、panel、cli 的类型检查都直接依赖这些合同，避免后续在实现阶段再做二次收口。

### 任务 2：为 bridge 建立会话索引与控制面

**文件：**
- 创建：`apps/bridge/src/sessionRegistry.ts`
- 创建：`apps/bridge/src/sessionRegistry.test.ts`
- 创建：`apps/bridge/src/controlApi.ts`
- 创建：`apps/bridge/src/controlApi.test.ts`
- 修改：`apps/bridge/src/httpServer.ts`
- 修改：`apps/bridge/src/httpServer.test.ts`
- 修改：`apps/bridge/src/index.ts`
- 修改：`apps/bridge/src/liveBridge.ts`
- 修改：`apps/bridge/src/server.ts`

- [ ] **步骤 1：建立 board-managed session registry**
  在 bridge 内部维护 active / recent 会话索引，并把 live connection、显示标题、最后活跃时间、可恢复标识等信息纳入统一管理。
- [ ] **步骤 2：为 bridge 增加最小控制 API**
  在现有 `/healthz`、`/api/state` 之外补上 `list/start/attach` 所需的控制入口，以及按 session 读取快照的查询能力；保持 API 仍然输出 shared 中定义的稳定合同。
- [ ] **步骤 3：用测试锁住控制面和索引行为**
  覆盖单会话启动、多会话列举、recent 回退、指定 session 快照读取和无效 session 错误路径。

### 任务 3：把 CLI 占位命令推进到真实编排入口

**文件：**
- 创建：`apps/cli/src/bridgeClient.ts`
- 创建：`apps/cli/src/bridgeProcess.ts`
- 创建：`apps/cli/src/startCommand.ts`
- 创建：`apps/cli/src/attachCommand.ts`
- 创建：`apps/cli/src/index.test.ts`
- 修改：`apps/cli/src/index.ts`
- 修改：`apps/cli/package.json`

- [ ] **步骤 1：为 CLI 建立 bridge 控制客户端**
  让 CLI 通过本地 HTTP 控制面与 bridge 通信，而不是在命令入口里直接堆叠底层流程细节。
- [ ] **步骤 2：建立 `start` 主路径**
  `start` 需要负责确保本地 bridge 可用、请求创建 board-managed session、生成目标 panel URL，并向用户输出清晰的运行状态。
- [ ] **步骤 3：建立 `attach` 主路径与最小选择逻辑**
  按设计文档先实现“单 active 自动附着，多 active 进入选择，零 active 展示 recent”的最小逻辑；如果首轮先用终端选择器或编号选择，需明确写入帮助输出和测试。

### 任务 4：让 panel 能消费目标会话而不是固定默认会话

**文件：**
- 修改：`apps/panel/src/api.ts`
- 修改：`apps/panel/src/api.test.ts`
- 修改：`apps/panel/src/panelState.ts`
- 修改：`apps/panel/src/panelState.test.ts`
- 修改：`apps/panel/src/App.tsx`
- 修改：`apps/panel/src/styles.css`

- [ ] **步骤 1：扩展 panel 的快照读取参数**
  让 panel 能把 `sessionId`、bridge base URL 或等价会话上下文传给 `api.ts`，而不是只固定读取默认 `/api/state`。
- [ ] **步骤 2：补齐目标会话缺失时的 UI 语义**
  当指定 session 不存在、bridge 尚未连接或 attach 还未选择目标时，页面需要给出明确空态，而不是模糊地退回 demo state。
- [ ] **步骤 3：把 session 选择后的视图切换纳入最小回归**
  用测试锁住 URL / 参数驱动的快照选择、错误路径和 fallback 行为，避免之后再把逻辑塞回组件里。

### 任务 5：文档回写与收尾验证

**文件：**
- 修改：`docs/status/mainline_status.md`
- 修改：`docs/index.md`
- 修改：`docs/design/2026-04-06-codex-realtime-board-v1-design.md`
- 必要时修改：`README.md`

- [ ] **步骤 1：回写当前状态与下一步**
  在 `status` 中记录 `start` / `attach` 主链路的完成结果、仍然有效的限制以及新的下一步。
- [ ] **步骤 2：收口索引与设计链接**
  确保 `design`、`plan`、`status` 和 `docs/index.md` 之间的引用关系保持一致，避免出现活跃计划失联。
- [ ] **步骤 3：运行仓库基线验证**
  运行 `corepack pnpm test`、`corepack pnpm typecheck`、`corepack pnpm build`，并把结果写进最终汇报。

## 完成态回写要求

- 全部 checklist 必须勾完。
- 对应 `status` 文档必须增加：
  - 完成结果摘要
  - 关键历史节点
  - 仍然有效的剩余风险（如果有）
- 需要把“完成时间 + 完成内容 + 必要时的一两句过程摘要”追加到 `docs/plan/history_plan.md`。
- 归档完成后，删除原计划文件，不再长期保留完成态 checklist。
