# Codex Realtime Board Monorepo 骨架初始化计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 初始化一个基于 `pnpm workspace + TypeScript` 的 monorepo，为 `launcher`、`bridge`、`panel` 和共享模型提供最小可运行骨架。

**架构：** 根目录负责 workspace、TypeScript 基础配置和统一脚本；`apps/cli`、`apps/bridge`、`apps/panel` 分别提供三个入口；`packages/shared` 承载设计文档中的核心数据模型和跨端共享类型。V1 先做占位级最小实现，不提前实现真实 `app-server` 连接逻辑。

**技术栈：** `pnpm workspace`、`TypeScript`、`tsx`、`React`、`Vite`

---

### 任务 1：建立 workspace 根配置

**文件：**
- 创建：`package.json`
- 创建：`pnpm-workspace.yaml`
- 创建：`tsconfig.base.json`
- 创建：`.editorconfig`
- 修改：`README.md`

- [ ] **步骤 1：创建根目录 workspace 配置**

定义 workspace 包范围、根脚本以及统一 `packageManager` 声明。

- [ ] **步骤 2：创建 TypeScript 共享基础配置**

抽出 `strict`、路径别名和 Node/DOM 兼容设置，供所有子包复用。

- [ ] **步骤 3：补充 README 中的骨架说明**

说明 monorepo 目录结构和各包职责，避免后续实现阶段重新梳理一次。

### 任务 2：创建共享模型包

**文件：**
- 创建：`packages/shared/package.json`
- 创建：`packages/shared/tsconfig.json`
- 创建：`packages/shared/src/index.ts`
- 创建：`packages/shared/src/contracts.ts`

- [ ] **步骤 1：把设计文档里的核心对象落成共享类型**

先定义 `SessionSummary`、`OverviewSnapshot`、`ToolSessionCard`、`SearchSessionCard`、`SkillActivationRecord`、`MemoryReferenceRecord`、`ContextSnapshot` 等接口。

- [ ] **步骤 2：导出最小公共常量和枚举**

补充 `SessionStatus`、`ToolKind`、`PhaseKind` 等骨架级枚举，给 bridge 和 panel 预留稳定接口。

### 任务 3：创建 CLI 与 bridge 最小入口

**文件：**
- 创建：`apps/cli/package.json`
- 创建：`apps/cli/tsconfig.json`
- 创建：`apps/cli/src/index.ts`
- 创建：`apps/bridge/package.json`
- 创建：`apps/bridge/tsconfig.json`
- 创建：`apps/bridge/src/index.ts`
- 创建：`apps/bridge/src/server.ts`

- [ ] **步骤 1：为 `codex-board` CLI 建立最小命令入口**

先支持 `start` 和 `attach` 两个子命令的占位输出，确保命令结构已就位。

- [ ] **步骤 2：为 bridge 建立最小服务入口**

提供一个不接真实协议的占位服务，能暴露健康状态和 mock 概览数据结构。

- [ ] **步骤 3：让 CLI 和 bridge 共享 `packages/shared` 类型**

确保目录边界和跨包依赖从第一天就是清晰的。

### 任务 4：创建 panel 最小前端

**文件：**
- 创建：`apps/panel/package.json`
- 创建：`apps/panel/tsconfig.json`
- 创建：`apps/panel/tsconfig.node.json`
- 创建：`apps/panel/vite.config.ts`
- 创建：`apps/panel/index.html`
- 创建：`apps/panel/src/main.tsx`
- 创建：`apps/panel/src/App.tsx`
- 创建：`apps/panel/src/styles.css`

- [ ] **步骤 1：初始化 Vite + React 面板骨架**

页面先只渲染 V1 信息架构、顶部概览卡片和 tabs 占位，不提前实现复杂交互。

- [ ] **步骤 2：使用共享模型准备一份 mock snapshot**

让 panel 从一开始就围绕最终数据模型渲染，而不是临时字符串拼接。

- [ ] **步骤 3：完成基础样式**

保持“独立 companion panel”的定位，做出清晰但克制的初始布局。

### 任务 5：安装依赖并验证

**文件：**
- 修改：`pnpm-lock.yaml`（安装后生成）

- [ ] **步骤 1：安装 workspace 依赖**

运行：`corepack pnpm install`

- [ ] **步骤 2：运行类型检查**

运行：`corepack pnpm typecheck`
预期：所有 workspace 包通过 TypeScript 检查

- [ ] **步骤 3：运行构建**

运行：`corepack pnpm build`
预期：CLI、bridge、panel 都能完成最小构建
