cod# Codex Realtime Board V1 设计方案

## 1. 背景

当前 `Codex CLI` 已经能高效完成真实开发工作，但在高强度使用过程中，仍然存在 3 类明显的信息黑盒：

1. 工具透明度不足。
   用户往往只能从最终回答反推过程，很难实时知道当前到底触发了哪些 `Skills`、`WebSearch`、`MCP` 工具、文件搜索或记忆引用。
2. 过程状态不直观。
   用户能感觉到「它在忙」，但不容易快速判断当前阶段是搜索、计划、执行命令、改文件，还是等待输入。
3. 上下文预算不易感知。
   虽然 `context` 压力确实会影响交互体验，但 CLI 本身不是为持续暴露这一信息而设计的。

这个项目要解决的不是「替代 Codex CLI」，而是给 `Codex CLI` 增加一个按需展开的 companion panel，让用户在不打断主工作流的前提下，随时获得更高透明度的运行视图。

## 2. 目标与非目标

### 2.1 目标

- 保持 `Codex CLI` 作为主工作面。
- 提供一个可折叠的实时 companion panel。
- 面板默认安静，仅在需要用户介入时做轻提示。
- V1 的信息优先级固定为：
  1. 工具透明度
  2. 过程状态
  3. 上下文预算
- 优先采用结构化协议事件，而不是解析终端字符流。
- 为后续迁移到 `VS Code` / `Cursor` webview 预留稳定的数据模型。

### 2.2 非目标

- 不在 V1 中把面板硬塞进终端字符界面。
- 不修改原生 `codex` 命令的默认行为。
- 不在 V1 中承诺「无侵入附着任意一个裸跑的 `codex` 进程」。
- 不在 V1 中做跨会话长期记忆管理器。
- 不在 V1 中追求完整 IDE 集成；IDE 侧栏是后续封装形态，不是第一落点。

## 3. 已确认的产品决策

### 3.1 使用形态

- 主工作面：`Codex CLI`
- 附加形态：独立 companion panel
- 侧栏策略：可折叠
- 收起态策略：默认安静，只在需要用户介入时提醒
- 提醒方式：轻提示 + 用户主动展开

### 3.2 启动策略

保留原生 `codex` 命令不变。

新增显式命令：

- `codex-board start`
  启动一个新会话，同时拉起 bridge 和 panel。
- `codex-board attach`
  附着到一个已存在的 board-managed 会话。

### 3.3 会话选择策略

`attach` 采用智能模式：

- 若只有 1 个活跃会话，则直接附着。
- 若有多个活跃会话，则先进入选择器。
- 若没有活跃会话，则显示最近会话列表。

会话选择器分为两块：

- `Active`
- `Recent`

### 3.4 首页结构

面板进入单会话后，首页采用混合视图：

- 上半区：实时摘要
- 下半区：事件时间线

顶部摘要的优先顺序固定为：

1. 当前工具
2. 当前阶段
3. `context` 预算

## 4. V1 信息架构

### 4.1 主 Tab

V1 主 Tab 固定为：

- `Overview`
- `Tools`
- `Search`
- `Skills`
- `Memories`
- `Context`

其中：

- `Indexing` 不单独开 Tab，先并入 `Search`
- `风险提示` 不占首页前三摘要，作为次级状态或 badge 暴露

### 4.2 Overview

`Overview` 的职责是让用户在 2 秒内回答以下问题：

- 它现在在调用什么？
- 它当前处在哪个阶段？
- 当前 `context` 还剩多少？
- 最近 30 秒到底发生了什么？

`Overview` 包含两部分：

1. 顶部摘要卡片
2. 聚合后的事件时间线

时间线采用混合流：

- 默认按工具会话聚合
- 支持展开查看原始事件

### 4.3 Tools

`Tools` Tab 的默认信息顺序为：

1. 调用了什么
2. 为什么调用
3. 一行结果摘要

不在默认卡片里铺满长输出；详细结果通过展开卡片查看。

### 4.4 Search

`Search` Tab 采用「搜索会话卡片」而不是原始事件流：

- 一次搜索任务对应一张卡片
- 卡片内部展示 `query`、页面打开、页内查找、结果摘要
- `Indexing` 的 inferred 信息先并入这里

### 4.5 Skills

`Skills` Tab 包含两层视角：

1. 本轮实际触发了哪些 `Skills`
2. 当前加载了哪些 `Skills`

默认优先展示第一层，也就是「实际触发记录」。

### 4.6 Memories

`Memories` 在 V1 中的定义非常收敛：

- 只展示本轮实际引用到的记忆
- 不做跨会话记忆库
- 不做线程级自动总结

换句话说，`Memories` 更像「本轮回答引用过哪些 memory/citation」，而不是长期知识面板。

### 4.7 Context

`Context` Tab 的信息优先级固定为：

1. 剩余容量
2. 压缩事件
3. 增长轨迹

其目标不是解释模型内部机制，而是告诉用户：

- 现在用了多少
- 还剩多少
- 什么时候发生了 `compact`
- 近期增长速度是否异常

## 5. 技术路线

### 5.1 选择原则

V1 不走终端字符流解析。

核心原因：

- 字符流只能得到表象，无法稳定恢复工具调用边界。
- 对 `Skills`、`WebSearch`、`Memory citation`、`context` 预算这类信息支持很弱。
- 长期维护成本高，且高度依赖 CLI 输出细节。

V1 应直接接 `Codex app-server` 暴露的结构化协议事件。

### 5.2 推荐架构

推荐采用三层结构：

1. `codex-board` launcher
2. 本地 bridge / cache service
3. companion panel UI

对应关系如下：

```text
+-------------------+        +--------------------------+        +----------------------+
| Codex CLI / TUI   | <----> | Local Bridge / Cache     | <----> | Companion Panel UI   |
| (user work surface)|       | session + event normalize|        | browser / webview    |
+-------------------+        +--------------------------+        +----------------------+
          ^                              |
          |                              v
          +--------------------> Codex app-server protocol
```

### 5.3 为什么需要 bridge / cache

不建议让前端直接啃 `Codex app-server` 协议，原因有 4 个：

1. 协议本身仍带实验性质，前端直接绑定会放大升级成本。
2. 前端需要的是稳定的产品语义，而不是底层原始事件。
3. 同一个底层事件往往需要聚合成更高层的视图，例如工具会话卡片、搜索会话卡片、上下文轨迹。
4. 后续如果要做浏览器窗口、桌面壳、`VS Code` webview，bridge 可以复用。

因此，bridge 的职责应明确限定为：

- 会话发现
- 活跃 / 最近会话索引
- 原始事件订阅
- 标准化事件模型
- 轻量历史缓存
- 推断态数据生成

## 6. 本地已验证的协议信号

基于本机 `codex-cli 0.118.0` 的实际检查，已经确认 `app-server` 具备较完整的结构化事件面。

已观察到的关键能力包括：

- `thread/tokenUsage/updated`
- `turn/plan/updated`
- `item/started`
- `item/completed`
- `item/agentMessage/delta`
- `item/mcpToolCall/progress`
- `skills/changed`
- `fuzzyFileSearch/sessionUpdated`
- `webSearch`
- `thread/compacted`

另外，在导出的类型里还能看到：

- `ThreadTokenUsage.modelContextWindow`
- `ThreadItem.agentMessage.memoryCitation`
- `SkillsList`
- `PluginList`
- `ThreadStatus`
- `TurnPlan`

这足以支撑 V1 的主线可视化。

## 7. 真事件与推断态边界

V1 允许「适度推断」，但必须明确标注。

| 领域 | V1 呈现方式 | 数据来源 | 说明 |
| --- | --- | --- | --- |
| Tools | 真事件为主 | `item/*`、`mcpToolCall`、命令执行项 | 工具会话卡片由多个底层事件聚合 |
| Search | 真事件为主 | `webSearch`、页面动作、文件搜索事件 | 一次搜索任务聚合为一张卡片 |
| Skills | 真事件 + 补拉列表 | `skills/changed`、`skills/list` | 触发记录优先，已加载列表次之 |
| Memories | 真事件优先，缺失时空态 | `memoryCitation` | 只展示实际引用，不做猜测性记忆生成 |
| Context | 真事件为主 | `thread/tokenUsage/updated`、`thread/compacted` | 预算和 compact 都可直接建模 |
| Indexing | 推断态 | `fuzzyFileSearch` 等相关活动 | 先并入 `Search`，明确标注 `inferred` |

## 8. 会话与命令模型

### 8.1 `codex-board start`

`start` 的职责：

- 启动本地 bridge
- 打开 companion panel
- 启动一个受管理的新 `Codex` 会话

这里的「受管理」非常关键：

- 只有进入 board 管理平面的会话，bridge 才能稳定拿到实时事件
- 这类会话应被记录为 `board-managed session`

### 8.2 `codex-board attach`

`attach` 不是去强行侵入任意一个裸跑的 `codex` 进程，而是附着到：

- 当前 bridge 已管理的活跃会话
- 或 bridge 有记录的最近会话

这是 V1 必须明确写清的边界。

如果未来 `Codex` 官方提供对独立 CLI 进程的稳定外部附着能力，可以再扩展「attach arbitrary session」。

### 8.3 智能附着逻辑

`attach` 的默认逻辑：

1. 查询活跃会话
2. 若活跃会话数为 1，则直接附着
3. 若活跃会话数大于 1，则打开选择器
4. 若活跃会话数为 0，则展示 `Recent`

## 9. UI 交互细节

### 9.1 收起态

收起态不持续打扰用户。

只在以下场景触发轻提示：

- 等待用户输入
- 审批请求
- 错误

提醒方式：

- 徽标高亮
- 轻量动画或标色
- 用户点击后展开

不自动强制展开侧栏。

### 9.2 展开态

展开后，用户首先看到：

1. 当前工具
2. 当前阶段
3. `context` 预算

然后才是事件流。

时间线卡片应支持：

- 折叠 / 展开
- 查看原始事件
- 按时间排序
- 快速过滤

## 10. V1 的推荐数据模型

bridge 对前端暴露的不是底层协议原文，而是产品化后的对象。建议至少有以下几类：

- `SessionSummary`
  - `sessionId`
  - `title`
  - `status`
  - `lastActiveAt`
  - `isManaged`
- `OverviewSnapshot`
  - `currentTool`
  - `currentPhase`
  - `contextBudget`
  - `pendingUserAction`
- `ToolSessionCard`
  - `toolKind`
  - `title`
  - `reason`
  - `summary`
  - `startedAt`
  - `endedAt`
  - `status`
- `SearchSessionCard`
  - `query`
  - `actions`
  - `summary`
  - `inferredIndexing`
- `SkillActivationRecord`
  - `skillName`
  - `source`
  - `status`
  - `timestamp`
- `MemoryReferenceRecord`
  - `sourceThreadId`
  - `entries`
  - `usedByTurnId`
- `ContextSnapshot`
  - `usedTokens`
  - `contextWindow`
  - `remainingTokens`
  - `recentCompactions`

## 11. 风险与不确定项

### 11.1 协议演进风险

`Codex app-server` 当前仍带实验性质。V1 设计必须接受以下现实：

- 事件名可能变化
- 类型结构可能调整
- 某些能力可能只对特定宿主开放

这正是需要 bridge 层的主要原因之一。

### 11.2 `Memories` 与 `Indexing` 的边界风险

`Tools`、`Search`、`Context` 的协议支撑较强；`Memories` 与 `Indexing` 相对弱一些。

因此：

- `Memories` 必须收敛为「实际引用到的记忆」
- `Indexing` 必须显式标注为 `inferred`

### 11.3 宿主形态风险

用户同时使用普通终端和 `VS Code` / `Cursor` 内置终端。

所以 V1 不能依赖某一种终端的分屏能力。第一落点应是独立 companion panel，后续再包成 IDE webview。

## 12. 推荐分阶段落地

### Phase A：协议打通

- 验证 `codex-board start` 的最小链路
- 建立 bridge 与 `Codex app-server` 的连接
- 跑通单会话订阅和事件接收

### Phase B：事件归一化

- 设计并实现 `SessionSummary`、`OverviewSnapshot`、`ToolSessionCard`
- 把原始事件聚合成可渲染对象
- 补上 `Active` / `Recent` 索引

### Phase C：面板原型

- 完成会话选择器
- 完成 `Overview`
- 完成 `Tools` / `Search` / `Skills` / `Context`
- `Memories` 先做收敛版

### Phase D：交互收口

- 收起态提醒
- 事件过滤
- 展开查看原始事件
- `attach` 智能选择逻辑

### Phase E：后续扩展

- 包装为 `VS Code` / `Cursor` webview
- 增加回放能力
- 扩展多会话总览
- 评估更完整的 `Memories` 与 `Indexing` 能力

## 13. 当前结论

当前最合理的实现方向是：

- 不碰原生 `codex` 默认工作流
- 新增 `codex-board` 显式入口
- 核心采用 `Codex app-server` 结构化事件
- 中间加一层本地 bridge / cache
- V1 先做独立 companion panel
- 后续再把同一套模型包装进 `VS Code` / `Cursor`

这条路径兼顾了 3 件事：

1. 足够真实可用
2. 不反向污染现有 `Codex CLI` 使用习惯
3. 为后续产品化和 IDE 集成留足结构空间
