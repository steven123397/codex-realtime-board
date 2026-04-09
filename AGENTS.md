# AGENTS.md

## 作用

这是仓库根目录的总览指引文件。

使用顺序：

1. 先读本文件，理解项目范围、阶段目标和全局约定。
2. 进入具体子树后，再读对应子目录下的 `AGENTS.md`。
3. 需要了解实时状态、设计边界或历史计划时，再进入 `docs/` 对应文档。

本仓库后续只维护 `AGENTS.md` 体系，不再维护 `CLAUDE.md`。

## 项目概况

仓库当前主体是 Codex Realtime Board，一个面向 `Codex CLI` 的实时 companion panel 原型。

当前定位：

- 已经是一个可运行的 monorepo 原型，不是纯设计稿。
- `V1` 产品边界已经收敛，`bridge -> panel` 的首条真实状态链路已经打通。
- 当前处于治理体系接入、实时链路稳定化，以及 `launcher/session` 编排逐步推进阶段。

长期目标：

- 在不替代 `Codex CLI` 主工作面的前提下，持续提高工具透明度、过程状态可见性和上下文预算可观测性。
- 先稳住独立 companion panel 的本地形态，再逐步封装为 `VS Code` / `Cursor` webview 等宿主形态。

## 仓库结构

- `apps/`
  运行时入口：`cli`、`bridge`、`panel`。
- `packages/`
  共享模型、跨端常量和稳定数据合同。
- `docs/`
  正式技术文档，按 `background / design / plan / status` 分层维护。
- `README.md`
  面向读者的项目概览、构建和运行说明。

## 子目录 AGENTS 索引

- `apps/AGENTS.md`
  `cli` / `bridge` / `panel` 子树的职责边界、局部规则和验证建议。
- `apps/bridge/AGENTS.md`
  bridge 协议接入、状态归一化、控制 API 与会话索引的局部规则。
- `apps/panel/AGENTS.md`
  panel 数据入口、fallback 语义、session 切换与 UI 呈现的局部规则。
- `packages/AGENTS.md`
  共享合同与跨端模型的局部规则。
- `docs/AGENTS.md`
  正式文档的分工、模板、索引和归档规则。

## 当前状态

当前仓库已经具备以下高层能力：

- `pnpm workspace + TypeScript` monorepo 基础骨架。
- `packages/shared` 中的 `V1` 共享数据模型、主 Tab 常量、bridge 健康合同，以及会话管理共享合同。
- `apps/bridge` 的 mock / live 双路径、`app-server` 客户端、多会话状态归一化，以及 `/healthz`、`/api/sessions`、`/api/state`、`/api/session/start`、`/api/session/attach` HTTP 出口。
- `apps/panel` 对 bridge snapshot 的按会话消费路径、定时轮询 / 手动刷新、stale / reconnect 反馈、运行中会话切换、demo fallback，以及会话缺失 / 未选定时的明确空态。
- `apps/cli` 的 `start` / `attach` 真实控制路径、最小交互式 attach 选择器，以及对本地 `app-server`、bridge、panel 运行时的最小 launcher 编排。
- 一组围绕 shared 合同、bridge 控制面、CLI 编排入口、panel 数据加载与衍生状态的最小单测。

## 当前优先级

决策顺序保持不变：

0. 先把仓库治理体系、文档入口和单一事实来源收口稳定。
1. 稳住 `bridge` 对 `Codex app-server` 协议的消费、归一化和对外状态合同。
2. 稳住已经打通的 `launcher/session` 编排主路径，并继续把 app-server / panel 生命周期纳入 launcher。
3. 在前两项稳定后，再继续扩 `panel` 的实时交互、更多 Tab 细节和宿主封装。

不要把这几条路线混在同一实现步骤里。

## 当前焦点

当前阶段的主线工作是：

- 把 `docs/`、`AGENTS.md` 和实现状态收口到同一套治理体系里。
- 保持 `packages/shared` 作为跨端数据模型和状态合同的单一来源。
- 继续稳住 `bridge` 的 live / mock 双路径、最小 HTTP 契约和状态归一化行为。
- 继续把 `panel` 维持在“消费 bridge 状态而不是直接啃底层协议”的结构边界上。
- 后续在已经打通的 `start / attach` 主链路上，继续推进 launcher 生命周期收口、会话发现 / 选择体验和更实时的 UI，而不是回退为终端字符流解析方案。

相关状态文档见：

- `docs/status/mainline_status.md`
- `docs/design/2026-04-06-codex-realtime-board-v1-design.md`
- `docs/plan/history_plan.md`

## 技术栈

- workspace：`pnpm workspace`
- host/runtime：`TypeScript` + Node.js
- panel：`React` + `Vite`
- 文档：Markdown

## 全局开发约定

- `Codex CLI` 始终是主工作面；本项目扩展的是 companion 能力，不是替代 CLI。
- 主线优先使用 `Codex app-server` 的结构化事件，不把终端字符流解析当成默认实现路径。
- `packages/shared` 是跨端合同的单一来源；涉及 bridge / panel 数据结构时，优先从这里收口。
- `README.md`、`docs/` 和各层 `AGENTS.md` 必须与当前实现同步。
- 状态、设计、计划严格分层，不要把同一件事同时写成多份实时真相。
- 优先小步落地，先补最窄验证，再扩到实现和文档。
- 不要提交 `node_modules/`、`dist/` 等构建产物。

## Agent 默认工作流

除非用户明确要求跳过、简化或改顺序，否则后续对话默认按下面流程推进。

### 实现 / 设计类任务

1. 先确认上下文。
   至少阅读仓库根 `AGENTS.md`、目标子树 `AGENTS.md`、相关 `status/design` 文档，并在预计会改代码或文档时先本地确认 `git status`、当前分支和未提交改动。
2. 遇到新增模块、大功能面、明显行为变化或新边界时，先对齐设计，再更新 `docs/design/`。
3. 设计或方向确定后，先同步 `docs/status/` 和相关 `AGENTS.md` 的当前口径，不要等代码写完再回头补。
4. 决定是否需要单独 `plan`。
   任务较大、步骤较多、需要分阶段验收时，在 `docs/plan/` 撰写计划文档；简单任务可以不单独写 `plan`。
5. 根据 `plan` 或用户要求开始执行。
   优先小步落地，先补最窄回归或最小验证，再扩到实现和更大门禁。
6. 工作完成后，优先同步文档。
   至少检查并更新相关 `status`、各级 `AGENTS.md`、必要时的 `README.md` / `docs/index.md`。
7. 汇报结果，并把提交与清理交还给开发者决定。
   汇报里要说明改动摘要、验证结果、剩余风险和建议下一步；不要默认自动提交。

### 代码审查 / 修改类任务

1. 审查发现默认集中写入 `docs/status/code_review_status.md`。
   如果文件不存在，就先创建；如果没有发现问题，也要明确写清“当前无活跃问题”。
2. 审查结论形成后，先同步 `docs/status/` 和相关 `AGENTS.md` 的下一步、优先级和处理口径。
3. 后续如果要进入修复，实现流程默认回到上面的第 4 步到第 7 步执行。

### 额外约束

- 不要跳过文档同步。
- 不要在未经确认的情况下直接提交或清理分支 / worktree。
- 不要把设计、状态、计划和实现混成一份文档；按 `docs/AGENTS.md` 的分工维护。
- 如果用户给了更具体的流程或边界，用户指令优先。

## 全局验证基线

默认至少关注：

- `corepack pnpm test`
- `corepack pnpm typecheck`
- `corepack pnpm build`

如果改动主要集中在 `bridge`，还应额外关注：

- `corepack pnpm --filter @codex-realtime-board/bridge test`

如果改动主要集中在 `panel`，还应额外关注：

- `corepack pnpm --filter @codex-realtime-board/panel test`

## 报告与总结规则

- 描述项目时，应把当前仓库表述为“面向 Codex CLI 的实时 companion panel 原型”。
- 报告里应明确区分：
  - 项目 owner 已完成的既有工作
  - 已落地的当前结构成果
  - 当前下一步工程任务
  - 更远期的宿主封装与产品化方向
