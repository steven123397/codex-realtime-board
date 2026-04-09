import { useEffect, useMemo, useState } from "react";

import { V1_PRIMARY_TABS, type V1PrimaryTab } from "@codex-realtime-board/shared";

import {
  buildOverviewTimeline,
  createDemoBoardState,
  loadPanelSnapshot,
  readPanelTargetFromSearch,
  type PanelSnapshot
} from "./panelState.js";

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

function renderEmptyState(title: string, body: string): React.JSX.Element {
  return (
    <section className="event-list">
      <article className="event-card empty-state">
        <strong>{title}</strong>
        <p>{body}</p>
      </article>
    </section>
  );
}

function getFeedLabel(snapshot: PanelSnapshot, loading: boolean): string {
  if (loading) {
    return "Connecting";
  }

  if (snapshot.source === "bridge") {
    return "Live bridge";
  }

  if (snapshot.source === "empty") {
    return "Session required";
  }

  return "Demo fallback";
}

function getFeedTone(snapshot: PanelSnapshot, loading: boolean): string {
  if (loading) {
    return "loading";
  }

  if (snapshot.source === "bridge") {
    return "live";
  }

  if (snapshot.source === "empty") {
    return "empty";
  }

  return "fallback";
}

function getHeroCopy(snapshot: PanelSnapshot, loading: boolean): string {
  if (loading) {
    return "Panel 正在尝试从本地 bridge 拉取 `/api/state`，成功后会把首页切到真实的归一化会话快照。";
  }

  if (snapshot.source === "bridge") {
    return "Companion panel 已开始消费 bridge 的归一化状态：顶部摘要、Tabs 与 Overview 时间线都来自真实 `app-server` 事件聚合。";
  }

  if (snapshot.source === "empty") {
    return "Bridge 已连通，但当前没有可渲染的目标会话。先完成 `codex-board start` 或 `codex-board attach`，再用带 `sessionId` 的 panel URL 打开该视图。";
  }

  return "当前未连上本地 bridge，所以页面先退回 demo snapshot；你仍然可以继续调界面，bridge 恢复后刷新即可切回真实数据。";
}

function renderTabEmptyState(snapshot: PanelSnapshot): React.JSX.Element | null {
  if (!snapshot.emptyState) {
    return null;
  }

  return renderEmptyState(snapshot.emptyState.title, snapshot.emptyState.body);
}

export default function App(): React.JSX.Element {
  const panelTarget = useMemo(() => readPanelTargetFromSearch(window.location.search), []);
  const [activeTab, setActiveTab] = useState<V1PrimaryTab>("Overview");
  const [panelSnapshot, setPanelSnapshot] = useState<PanelSnapshot>(() => ({
    board: createDemoBoardState(),
    source: "fallback",
    errorMessage: null,
    emptyState: null
  }));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      const snapshot = await loadPanelSnapshot({
        baseUrl: panelTarget.baseUrl,
        sessionId: panelTarget.sessionId
      });
      if (cancelled) {
        return;
      }

      setPanelSnapshot(snapshot);
      setLoading(false);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [panelTarget.baseUrl, panelTarget.sessionId]);

  const { board } = panelSnapshot;
  const { session, overview, tools, searches, skills, memories, context } = board;

  const contextUsage = useMemo(() => {
    if (overview.contextBudget.contextWindow <= 0) {
      return 0;
    }

    return Math.round((overview.contextBudget.usedTokens / overview.contextBudget.contextWindow) * 100);
  }, [overview.contextBudget.contextWindow, overview.contextBudget.usedTokens]);

  const overviewTimeline = useMemo(() => buildOverviewTimeline(board), [board]);
  const feedLabel = getFeedLabel(panelSnapshot, loading);
  const feedTone = getFeedTone(panelSnapshot, loading);
  const tabEmptyState = renderTabEmptyState(panelSnapshot);

  return (
    <main className="shell">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">Board-managed session</span>
          <h1>{session.title}</h1>
          <p>{getHeroCopy(panelSnapshot, loading)}</p>
        </div>
        <div className="hero-meta">
          <span className="meta-label">Session</span>
          <strong>{session.sessionId}</strong>
          <div className="hero-pills">
            <span className="status-pill">{session.status}</span>
            <span className={`status-pill source-pill ${feedTone}`}>{feedLabel}</span>
          </div>
          <span className="meta-label">Last active</span>
          <strong>{formatLocalTime(session.lastActiveAt)}</strong>
        </div>
      </section>

      {panelSnapshot.errorMessage && !loading && (
        <section className="notice-banner">
          <strong>{panelSnapshot.source === "fallback" ? "Bridge unavailable" : "Session unavailable"}</strong>
          <p>
            {panelSnapshot.errorMessage}
            {panelSnapshot.source === "fallback" ? "。当前继续展示 demo snapshot。" : "。请重新选择可用会话。"}
          </p>
        </section>
      )}

      <section className="summary-grid">
        <article className="summary-card">
          <span className="meta-label">Current tool</span>
          <strong>{overview.currentTool ?? "Idle"}</strong>
          <p>{overview.pendingUserAction ? overview.pendingUserAction.label : "V1 首优先级：实时知道它现在正在调用什么。"}</p>
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
          {tabEmptyState ?? renderList("Recent activity", overviewTimeline)}
          <section className="panel-block two-column-grid">
            <article className="detail-card">
              <div className="section-heading">
                <span>Connection feed</span>
              </div>
              <ul>
                <li>Source: {feedLabel}</li>
                <li>
                  Bridge endpoint: `GET /api/state`
                  {panelTarget.sessionId ? `?sessionId=${panelTarget.sessionId}` : ""}
                </li>
                <li>Health endpoint: `GET /healthz`</li>
              </ul>
            </article>
            <article className="detail-card">
              <div className="section-heading">
                <span>State signals</span>
              </div>
              <ul>
                <li>Session status: {session.status}</li>
                <li>Pending action: {overview.pendingUserAction?.label ?? "none"}</li>
                <li>Recent compactions: {context.recentCompactions.length}</li>
              </ul>
            </article>
          </section>
        </>
      )}

      {activeTab === "Tools" &&
        (tabEmptyState ? (
          tabEmptyState
        ) : tools.length > 0 ? (
          <section className="event-list">
            {tools.map((item) => (
              <article className="event-card" key={`${item.title}-${item.startedAt}`}>
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
        ) : (
          renderEmptyState("No tool sessions yet", "Bridge 已连上，但这一轮还没有聚合出工具会话卡片。")
        ))}

      {activeTab === "Search" &&
        (tabEmptyState ? (
          tabEmptyState
        ) : searches.length > 0 ? (
          <section className="event-list">
            {searches.map((item) => (
              <article className="event-card" key={`${item.query}-${item.startedAt}`}>
                <div className="event-meta">
                  <span>search session</span>
                  <span>{item.inferredIndexing ? "inferred" : item.status}</span>
                </div>
                <strong>{item.query}</strong>
                <p>{item.actions.join(" -> ") || "No recorded actions"}</p>
                <small>{item.summary}</small>
              </article>
            ))}
          </section>
        ) : (
          renderEmptyState("No search sessions yet", "当前会话还没有产生 Search 卡片，或 bridge 尚未聚合相关事件。")
        ))}

      {activeTab === "Skills" &&
        (tabEmptyState ? (
          tabEmptyState
        ) : skills.length > 0 ? (
          <section className="event-list">
            {skills.map((item) => (
              <article className="event-card" key={`${item.skillName}-${item.timestamp}`}>
                <div className="event-meta">
                  <span>{item.source}</span>
                  <span>{formatLocalTime(item.timestamp)}</span>
                </div>
                <strong>{item.skillName}</strong>
                <small>{item.status}</small>
              </article>
            ))}
          </section>
        ) : (
          renderEmptyState("No skill activations yet", "这一轮暂时还没有记录到实际触发的技能。")
        ))}

      {activeTab === "Memories" &&
        (tabEmptyState ? (
          tabEmptyState
        ) : memories.length > 0 ? (
          <section className="event-list">
            {memories.map((item) => (
              <article className="event-card" key={`${item.sourceThreadId}-${item.usedByTurnId}`}>
                <div className="event-meta">
                  <span>{item.sourceThreadId}</span>
                  <span>{item.usedByTurnId}</span>
                </div>
                <strong>{item.entries[0]?.title ?? "Memory citation"}</strong>
                <small>{item.entries[0]?.excerpt ?? "No excerpt recorded"}</small>
              </article>
            ))}
          </section>
        ) : (
          renderEmptyState("No memory citations yet", "V1 只展示本轮真正引用到的 memory/citation。")
        ))}

      {activeTab === "Context" &&
        (tabEmptyState ? (
          tabEmptyState
        ) : (
          <section className="panel-block two-column-grid">
            <article className="detail-card">
              <div className="section-heading">
                <span>Budget snapshot</span>
              </div>
              <ul>
                <li>Used: {formatTokens(context.usedTokens)}</li>
                <li>Remaining: {formatTokens(context.remainingTokens)}</li>
                <li>Trend: {context.growthTrend}</li>
              </ul>
            </article>
            <article className="detail-card">
              <div className="section-heading">
                <span>Compaction history</span>
              </div>
              <ul>
                {context.recentCompactions.length > 0 ? (
                  context.recentCompactions.map((item) => <li key={item}>{formatLocalTime(item)}</li>)
                ) : (
                  <li>No compaction events yet</li>
                )}
              </ul>
            </article>
          </section>
        ))}
    </main>
  );
}
