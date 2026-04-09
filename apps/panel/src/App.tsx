import { useEffect, useMemo, useRef, useState } from "react";

import {
  V1_PRIMARY_TABS,
  type ManagedSessionSummary,
  type V1PrimaryTab
} from "@codex-realtime-board/shared";

import {
  buildPanelTargetSearch,
  buildOverviewTimeline,
  createDemoBoardState,
  createPanelPoller,
  loadPanelSnapshot,
  PANEL_AUTO_REFRESH_INTERVAL_MS,
  readPanelTargetFromSearch,
  type PanelPoller,
  type PanelSnapshot
} from "./panelState.js";

function formatLocalTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatSyncTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function formatRelativeTime(value: string): string {
  const diffMs = Date.now() - Date.parse(value);
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return "just now";
  }

  const diffSeconds = Math.floor(diffMs / 1_000);
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours}h ago`;
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

function renderSessionBucket(
  title: string,
  sessions: readonly ManagedSessionSummary[],
  selectedSessionId: string | null,
  onSelect: (sessionId: string) => void
): React.JSX.Element {
  return (
    <article className="detail-card session-group">
      <div className="section-heading section-heading-tight">
        <span>{title}</span>
        <span className="meta-label">{sessions.length} sessions</span>
      </div>
      {sessions.length > 0 ? (
        <div className="session-grid">
          {sessions.map((item) => {
            const isSelected = item.sessionId === selectedSessionId;
            return (
              <button
                className={isSelected ? "session-option active" : "session-option"}
                disabled={isSelected}
                key={item.sessionId}
                onClick={() => onSelect(item.sessionId)}
                type="button"
              >
                <div className="session-option-head">
                  <strong>{item.title}</strong>
                  <span className={`session-status ${item.status}`}>{item.status}</span>
                </div>
                <div className="session-option-meta">
                  <span>{item.sessionId}</span>
                  <span>{formatLocalTime(item.lastActiveAt)}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="helper-copy">当前没有可切换的 {title.toLowerCase()} 会话。</p>
      )}
    </article>
  );
}

function getFeedLabel(
  snapshot: PanelSnapshot,
  loading: boolean,
  refreshing: boolean,
  targetSessionId: string | null
): string {
  if (loading && targetSessionId && targetSessionId !== snapshot.board.session.sessionId) {
    return "Switching session";
  }

  if (loading && !snapshot.lastLiveAt) {
    return "Connecting";
  }

  if (snapshot.connectionState === "live") {
    return "Live bridge";
  }

  if (snapshot.connectionState === "stale") {
    return refreshing ? "Reconnecting" : "Stale bridge";
  }

  if (snapshot.connectionState === "empty") {
    return "Session required";
  }

  return "Demo fallback";
}

function getFeedTone(
  snapshot: PanelSnapshot,
  loading: boolean,
  targetSessionId: string | null
): string {
  if (loading && targetSessionId && targetSessionId !== snapshot.board.session.sessionId) {
    return "loading";
  }

  if (loading && !snapshot.lastLiveAt) {
    return "loading";
  }

  if (snapshot.connectionState === "live") {
    return "live";
  }

  if (snapshot.connectionState === "stale") {
    return "stale";
  }

  if (snapshot.connectionState === "empty") {
    return "empty";
  }

  return "fallback";
}

function getRefreshLabel(
  snapshot: PanelSnapshot,
  loading: boolean,
  refreshing: boolean,
  targetSessionId: string | null
): string {
  if (loading && targetSessionId && targetSessionId !== snapshot.board.session.sessionId) {
    return "Switching target";
  }

  if (loading && !snapshot.lastLiveAt) {
    return "Initial sync";
  }

  if (snapshot.connectionState === "stale" && refreshing) {
    return `Reconnect #${snapshot.refreshFailures + 1}`;
  }

  if (refreshing) {
    return "Refreshing";
  }

  if (snapshot.connectionState === "stale") {
    return `Retry in ${Math.round(PANEL_AUTO_REFRESH_INTERVAL_MS / 1_000)}s`;
  }

  return `Polling ${Math.round(PANEL_AUTO_REFRESH_INTERVAL_MS / 1_000)}s`;
}

function getRefreshTone(snapshot: PanelSnapshot, loading: boolean, refreshing: boolean): string {
  if (loading && !snapshot.lastLiveAt) {
    return "loading";
  }

  if (snapshot.connectionState === "stale") {
    return refreshing ? "loading" : "stale";
  }

  if (refreshing) {
    return "live";
  }

  return "ready";
}

function getHeroCopy(snapshot: PanelSnapshot, loading: boolean, targetSessionId: string | null): string {
  if (loading && targetSessionId && targetSessionId !== snapshot.board.session.sessionId) {
    return "Panel 正在切换目标会话：会重新读取 bridge 的 `/api/state` 与 `/api/sessions`，并把 companion 视图对准新的 board-managed session。";
  }

  if (loading && !snapshot.lastLiveAt) {
    return "Panel 正在尝试从本地 bridge 拉取 `/api/state`，成功后会把首页切到真实的归一化会话快照。";
  }

  if (snapshot.connectionState === "live") {
    return "Companion panel 已开始消费 bridge 的归一化状态：顶部摘要、Tabs 与 Overview 时间线都来自真实 `app-server` 事件聚合。";
  }

  if (snapshot.connectionState === "stale") {
    return "Bridge 正在重连中，页面先保留最近一次 live snapshot；你可以继续观察当前会话，也能切换到其他 board-managed session。";
  }

  if (snapshot.connectionState === "empty") {
    return "Bridge 已连通，但当前没有可渲染的目标会话。先完成 `codex-board start` 或 `codex-board attach`，再用带 `sessionId` 的 panel URL 打开该视图。";
  }

  return "当前未连上本地 bridge，所以页面先退回 demo snapshot；你仍然可以继续调界面，bridge 恢复后刷新即可切回真实数据。";
}

function getNoticeContent(
  snapshot: PanelSnapshot,
  loading: boolean,
  refreshing: boolean
): { tone: string; title: string; body: string } | null {
  if (loading && !snapshot.lastLiveAt) {
    return null;
  }

  if (snapshot.connectionState === "stale") {
    const staleSince = snapshot.staleSince ? formatRelativeTime(snapshot.staleSince) : "just now";
    const lastLiveAt = snapshot.lastLiveAt ? formatSyncTime(snapshot.lastLiveAt) : formatSyncTime(snapshot.loadedAt);
    return {
      tone: "stale",
      title: refreshing ? "Bridge reconnecting" : "Bridge snapshot stale",
      body: `当前继续展示 ${lastLiveAt} 的最后一次 live snapshot，stale 状态开始于 ${staleSince}。失败次数：${snapshot.refreshFailures}。${
        snapshot.errorMessage ? `最近错误：${snapshot.errorMessage}` : ""
      }`
    };
  }

  if (snapshot.source === "fallback") {
    return {
      tone: "fallback",
      title: "Bridge unavailable",
      body: `${snapshot.errorMessage ?? "Bridge request failed."}。当前继续展示 demo snapshot，待 bridge 恢复后即可切回真实数据。`
    };
  }

  if (snapshot.source === "empty" && snapshot.errorMessage) {
    return {
      tone: "empty",
      title: "Session unavailable",
      body: `${snapshot.errorMessage}。请重新选择可用会话。`
    };
  }

  return null;
}

function renderTabEmptyState(snapshot: PanelSnapshot): React.JSX.Element | null {
  if (!snapshot.emptyState) {
    return null;
  }

  return renderEmptyState(snapshot.emptyState.title, snapshot.emptyState.body);
}

export default function App(): React.JSX.Element {
  const [panelTarget, setPanelTarget] = useState(() => readPanelTargetFromSearch(window.location.search));
  const pollerRef = useRef<PanelPoller | null>(null);
  const [activeTab, setActiveTab] = useState<V1PrimaryTab>("Overview");
  const [panelSnapshot, setPanelSnapshot] = useState<PanelSnapshot>(() => ({
    board: createDemoBoardState(),
    source: "fallback",
    connectionState: "fallback",
    errorMessage: null,
    emptyState: null,
    loadedAt: new Date().toISOString(),
    staleSince: null,
    lastLiveAt: null,
    refreshFailures: 0,
    sessions: null,
    sessionDirectoryError: null
  }));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setLoading(true);
    setRefreshing(false);

    const poller = createPanelPoller({
      loadSnapshot: ({ previousSnapshot }) =>
        loadPanelSnapshot({
          baseUrl: panelTarget.baseUrl,
          sessionId: panelTarget.sessionId,
          previousSnapshot
        }),
      onSnapshot(snapshot) {
        setPanelSnapshot(snapshot);
      },
      onLoadingChange(nextLoading) {
        setLoading(nextLoading);
      },
      onRefreshingChange(nextRefreshing) {
        setRefreshing(nextRefreshing);
      }
    });

    pollerRef.current = poller;
    void poller.start();

    return () => {
      poller.stop();
      if (pollerRef.current === poller) {
        pollerRef.current = null;
      }
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
  const targetSessionId = panelTarget.sessionId;
  const selectedSessionId = targetSessionId ?? panelSnapshot.sessions?.selectedSessionId ?? board.session.sessionId;
  const feedLabel = getFeedLabel(panelSnapshot, loading, refreshing, targetSessionId);
  const feedTone = getFeedTone(panelSnapshot, loading, targetSessionId);
  const refreshLabel = getRefreshLabel(panelSnapshot, loading, refreshing, targetSessionId);
  const refreshTone = getRefreshTone(panelSnapshot, loading, refreshing);
  const tabEmptyState = renderTabEmptyState(panelSnapshot);
  const refreshDisabled = loading || refreshing;
  const notice = getNoticeContent(panelSnapshot, loading, refreshing);
  const sessionCount =
    (panelSnapshot.sessions?.active.length ?? 0) + (panelSnapshot.sessions?.recent.length ?? 0);

  async function handleRefreshNow(): Promise<void> {
    await pollerRef.current?.refresh();
  }

  function handleSessionSwitch(nextSessionId: string): void {
    setPanelTarget((currentTarget) => {
      if (currentTarget.sessionId === nextSessionId) {
        return currentTarget;
      }

      const nextTarget = {
        ...currentTarget,
        sessionId: nextSessionId
      };
      const nextSearch = buildPanelTargetSearch(window.location.search, nextTarget);
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${nextSearch}${window.location.hash}`
      );
      return nextTarget;
    });
  }

  return (
    <main className="shell">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">Board-managed session</span>
          <h1>{session.title}</h1>
          <p>{getHeroCopy(panelSnapshot, loading, targetSessionId)}</p>
        </div>
        <div className="hero-meta">
          <span className="meta-label">Session</span>
          <strong>{session.sessionId}</strong>
          <div className="hero-pills">
            <span className="status-pill">{session.status}</span>
            <span className={`status-pill source-pill ${feedTone}`}>{feedLabel}</span>
            <span className={`status-pill refresh-pill ${refreshTone}`}>{refreshLabel}</span>
          </div>
          <span className="meta-label">Last active</span>
          <strong>{formatLocalTime(session.lastActiveAt)}</strong>
          <span className="meta-label">Last sync</span>
          <strong>{formatSyncTime(panelSnapshot.loadedAt)}</strong>
        </div>
      </section>

      {notice && (
        <section className={`notice-banner ${notice.tone}`}>
          <strong>{notice.title}</strong>
          <p>{notice.body}</p>
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
          <span>Session directory</span>
          <span className="meta-label">
            {panelSnapshot.sessionDirectoryError ? "directory degraded" : `${sessionCount} sessions`}
          </span>
        </div>

        {panelSnapshot.sessions ? (
          <div className="session-directory">
            {renderSessionBucket(
              "Active",
              panelSnapshot.sessions.active,
              selectedSessionId,
              handleSessionSwitch
            )}
            {renderSessionBucket(
              "Recent",
              panelSnapshot.sessions.recent,
              selectedSessionId,
              handleSessionSwitch
            )}
          </div>
        ) : (
          <p className="helper-copy">
            {panelSnapshot.sessionDirectoryError
              ? `当前无法读取 \`GET /api/sessions\`：${panelSnapshot.sessionDirectoryError}`
              : "Bridge 侧暂时还没有可展示的 board-managed session 目录。"}
          </p>
        )}

        {panelSnapshot.sessionDirectoryError && panelSnapshot.sessions && (
          <p className="helper-copy">
            当前继续沿用最近一次成功读取到的 session 目录；bridge 恢复后会自动重新同步。
          </p>
        )}
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
              <div className="section-heading section-heading-tight">
                <span>Connection feed</span>
                <button
                  className="refresh-button"
                  disabled={refreshDisabled}
                  onClick={() => {
                    void handleRefreshNow();
                  }}
                  type="button"
                >
                  {refreshDisabled ? refreshLabel : "Refresh now"}
                </button>
              </div>
              <ul>
                <li>Source: {feedLabel}</li>
                <li>Refresh mode: {refreshLabel}</li>
                <li>Last sync: {formatSyncTime(panelSnapshot.loadedAt)}</li>
                <li>
                  Last live:{" "}
                  {panelSnapshot.lastLiveAt ? `${formatSyncTime(panelSnapshot.lastLiveAt)} (${formatRelativeTime(panelSnapshot.lastLiveAt)})` : "not available"}
                </li>
                <li>
                  Bridge endpoint: `GET /api/state`
                  {panelTarget.sessionId ? `?sessionId=${panelTarget.sessionId}` : ""}
                </li>
                <li>Session directory: `GET /api/sessions`</li>
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
                <li>Reconnect failures: {panelSnapshot.refreshFailures}</li>
              </ul>
            </article>
            <article className="detail-card">
              <div className="section-heading">
                <span>Incremental path</span>
              </div>
              <ul>
                <li>Current path: fixed-interval `/api/state` snapshot polling</li>
                <li>Preserve last live snapshot before falling back to demo</li>
                <li>Next candidate: bridge-side cursor / delta endpoint</li>
                <li>Push upgrade stays inside bridge, not panel direct protocol access</li>
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
