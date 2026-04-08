import { useMemo, useState } from "react";

import {
  V1_PRIMARY_TABS,
  type MemoryReferenceRecord,
  type OverviewSnapshot,
  type SearchSessionCard,
  type SessionSummary,
  type SkillActivationRecord,
  type ToolSessionCard,
  type V1PrimaryTab
} from "@codex-realtime-board/shared";

const session: SessionSummary = {
  sessionId: "session_local_demo",
  title: "Codex Realtime Board V1 bootstrap",
  status: "running",
  lastActiveAt: new Date().toISOString(),
  isManaged: true
};

const overview: OverviewSnapshot = {
  currentTool: "webSearch",
  currentPhase: "planning",
  contextBudget: {
    usedTokens: 38240,
    contextWindow: 128000,
    remainingTokens: 89760,
    recentCompactions: [new Date(Date.now() - 48 * 60_000).toISOString()],
    growthTrend: "rising",
    pressure: "low"
  },
  pendingUserAction: null
};

const tools: ToolSessionCard[] = [
  {
    toolKind: "webSearch",
    title: "Inspect app-server event surface",
    reason: "Map raw protocol events to board-level cards",
    summary: "Token usage, plan, item lifecycle, skills, search, and compact events are visible.",
    startedAt: new Date(Date.now() - 20 * 60_000).toISOString(),
    endedAt: new Date(Date.now() - 18 * 60_000).toISOString(),
    status: "completed"
  },
  {
    toolKind: "skill",
    title: "Bootstrap implementation plan",
    reason: "Lock the workspace shape before writing code",
    summary: "Create a workspace plan and align launcher, bridge, panel, and shared boundaries.",
    startedAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    status: "active"
  }
];

const searches: SearchSessionCard[] = [
  {
    query: "codex app-server structured events",
    actions: ["webSearch", "open docs", "compare event names"],
    summary: "A single search session rolls up page access and result synthesis.",
    inferredIndexing: false,
    startedAt: new Date(Date.now() - 22 * 60_000).toISOString(),
    status: "completed"
  }
];

const skills: SkillActivationRecord[] = [
  {
    skillName: "brainstorming",
    source: "local skill registry",
    status: "completed",
    timestamp: new Date(Date.now() - 16 * 60_000).toISOString()
  },
  {
    skillName: "writing-plans",
    source: "local skill registry",
    status: "completed",
    timestamp: new Date(Date.now() - 11 * 60_000).toISOString()
  }
];

const memories: MemoryReferenceRecord[] = [
  {
    sourceThreadId: "thread_bootstrap",
    entries: [
      {
        title: "V1 information priority",
        excerpt: "Tools first, process state second, context budget third."
      }
    ],
    usedByTurnId: "turn_bootstrap"
  }
];

const timeline = [
  "Overview 顶部摘要固定展示当前工具、当前阶段和 context 预算。",
  "Search 以会话卡片而不是原始事件流呈现。",
  "Bridge 当前返回 mock 数据，后续再接入真实 app-server 事件。"
];

function formatLocalTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatTokens(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function renderList(title: string, items: string[]): React.JSX.Element {
  return (
    <section className="panel-block">
      <div className="section-heading">
        <span>{title}</span>
      </div>
      <div className="event-list">
        {items.map((item) => (
          <article className="event-card" key={item}>
            {item}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<V1PrimaryTab>("Overview");

  const contextUsage = useMemo(() => {
    return Math.round((overview.contextBudget.usedTokens / overview.contextBudget.contextWindow) * 100);
  }, []);

  return (
    <main className="shell">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">Board-managed session</span>
          <h1>{session.title}</h1>
          <p>
            Companion panel 的第一版骨架已经就位。当前页面围绕设计文档里的数据模型渲染，
            后续只需要把 bridge 的 mock 数据替换成真实 `app-server` 事件流。
          </p>
        </div>
        <div className="hero-meta">
          <span className="meta-label">Session</span>
          <strong>{session.sessionId}</strong>
          <span className="status-pill">{session.status}</span>
          <span className="meta-label">Last active</span>
          <strong>{formatLocalTime(session.lastActiveAt)}</strong>
        </div>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <span className="meta-label">Current tool</span>
          <strong>{overview.currentTool ?? "Idle"}</strong>
          <p>V1 首优先级：实时知道它现在正在调用什么。</p>
        </article>
        <article className="summary-card">
          <span className="meta-label">Current phase</span>
          <strong>{overview.currentPhase}</strong>
          <p>按规划、搜索、执行、编辑、等待输入等阶段呈现。</p>
        </article>
        <article className="summary-card accent-card">
          <span className="meta-label">Context budget</span>
          <strong>{contextUsage}% used</strong>
          <p>
            {formatTokens(overview.contextBudget.remainingTokens)} / {formatTokens(overview.contextBudget.contextWindow)} tokens remaining
          </p>
        </article>
      </section>

      <section className="panel-block">
        <div className="section-heading">
          <span>V1 tabs</span>
          <span className="meta-label">{V1_PRIMARY_TABS.length} sections</span>
        </div>
        <div className="tabs-row">
          {V1_PRIMARY_TABS.map((tab) => (
            <button
              className={tab === activeTab ? "tab-button active" : "tab-button"}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "Overview" && (
        <>
          {renderList("Recent activity", timeline)}
          <section className="panel-block two-column-grid">
            <article className="detail-card">
              <div className="section-heading">
                <span>Current stack</span>
              </div>
              <ul>
                <li>`launcher` 负责启动和附着入口</li>
                <li>`bridge` 负责归一化事件和本地缓存</li>
                <li>`panel` 使用共享模型直接渲染卡片与时间线</li>
              </ul>
            </article>
            <article className="detail-card">
              <div className="section-heading">
                <span>Next milestones</span>
              </div>
              <ul>
                <li>接真实 `Codex app-server` 连接</li>
                <li>补 `start` / `attach` 智能会话发现</li>
                <li>把 Tools / Search / Skills 改成真实聚合数据</li>
              </ul>
            </article>
          </section>
        </>
      )}

      {activeTab === "Tools" && (
        <section className="event-list">
          {tools.map((item) => (
            <article className="event-card" key={item.title}>
              <div className="event-meta">
                <span>{item.toolKind}</span>
                <span>{item.status}</span>
              </div>
              <strong>{item.title}</strong>
              <p>{item.reason}</p>
              <small>{item.summary}</small>
            </article>
          ))}
        </section>
      )}

      {activeTab === "Search" && (
        <section className="event-list">
          {searches.map((item) => (
            <article className="event-card" key={item.query}>
              <div className="event-meta">
                <span>search session</span>
                <span>{item.inferredIndexing ? "inferred" : item.status}</span>
              </div>
              <strong>{item.query}</strong>
              <p>{item.actions.join(" -> ")}</p>
              <small>{item.summary}</small>
            </article>
          ))}
        </section>
      )}

      {activeTab === "Skills" && (
        <section className="event-list">
          {skills.map((item) => (
            <article className="event-card" key={item.skillName}>
              <div className="event-meta">
                <span>{item.source}</span>
                <span>{formatLocalTime(item.timestamp)}</span>
              </div>
              <strong>{item.skillName}</strong>
              <small>{item.status}</small>
            </article>
          ))}
        </section>
      )}

      {activeTab === "Memories" && (
        <section className="event-list">
          {memories.map((item) => (
            <article className="event-card" key={item.sourceThreadId}>
              <div className="event-meta">
                <span>{item.sourceThreadId}</span>
                <span>{item.usedByTurnId}</span>
              </div>
              <strong>{item.entries[0]?.title}</strong>
              <small>{item.entries[0]?.excerpt}</small>
            </article>
          ))}
        </section>
      )}

      {activeTab === "Context" && (
        <section className="panel-block two-column-grid">
          <article className="detail-card">
            <div className="section-heading">
              <span>Budget snapshot</span>
            </div>
            <ul>
              <li>Used: {formatTokens(overview.contextBudget.usedTokens)}</li>
              <li>Remaining: {formatTokens(overview.contextBudget.remainingTokens)}</li>
              <li>Trend: {overview.contextBudget.growthTrend}</li>
            </ul>
          </article>
          <article className="detail-card">
            <div className="section-heading">
              <span>Compaction history</span>
            </div>
            <ul>
              {overview.contextBudget.recentCompactions.map((item) => (
                <li key={item}>{formatLocalTime(item)}</li>
              ))}
            </ul>
          </article>
        </section>
      )}
    </main>
  );
}
