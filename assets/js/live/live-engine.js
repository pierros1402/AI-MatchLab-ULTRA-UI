// ======================================================================
// AI MATCHLAB ULTRA — SINGLE LIVE ENGINE (DARK/LIGHT READY)
// Endpoint: https://live-matches-worker.pierros1402.workers.dev/api/live-matches
// Renders into #live-matches-list as .live-card tiles
// ======================================================================

const LIVE_ENDPOINT =
  "https://live-matches-worker.pierros1402.workers.dev/api/live-matches";
const REFRESH_INTERVAL = 20000;

const STATE = {
  cache: [],
  previousSnapshot: {},
  isRefreshing: false
};

let listEl = null;
let statusEl = null;

// --------------------------------------------------
// STATUS INDICATOR
// --------------------------------------------------
function getStatusElement() {
  if (statusEl) return statusEl;
  const panel = document.getElementById("right-panel");
  if (!panel) return null;

  const el = document.createElement("div");
  el.id = "live-status-indicator";
  el.className = "live-status-pill";
  el.innerHTML = '<span class="live-dot"></span><span>Live</span>';
  panel.insertBefore(el, panel.querySelector("h2")?.nextSibling || panel.firstChild);
  statusEl = el;
  return el;
}

function setStatusLabel(label, color) {
  const el = getStatusElement();
  if (!el) return;
  const textSpan = el.querySelector("span:last-child");
  if (textSpan) textSpan.textContent = label;
  if (color) el.style.color = color;
}

// --------------------------------------------------
// FETCH WITH TIMEOUT + FALLBACK
// --------------------------------------------------
async function fetchLiveMatches() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(LIVE_ENDPOINT, {
      cache: "no-store",
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) throw new Error("HTTP " + res.status);

    const json = await res.json();
    STATE.cache = json.matches || [];
    return STATE.cache;
  } catch (err) {
    console.warn("[LIVE] Fetch error, returning cache:", err);
    return STATE.cache;
  }
}

// --------------------------------------------------
// EVENT DETECTION (goals + status changes)
// --------------------------------------------------
function detectEvents(matches) {
  const events = [];

  matches.forEach(m => {
    const prev = STATE.previousSnapshot[m.match_id];
    if (!prev) {
      STATE.previousSnapshot[m.match_id] = m;
      return;
    }

    if (m.score !== prev.score) {
      events.push({ type: "goal", id: m.match_id });
    }
    if (m.status !== prev.status) {
      events.push({ type: "status", id: m.match_id });
    }

    STATE.previousSnapshot[m.match_id] = m;
  });

  return events;
}

function applyEvents(events) {
  events.forEach(ev => {
    const row = document.querySelector(`[data-match-id="${ev.id}"]`);
    if (!row) return;
    if (ev.type === "goal") {
      row.classList.add("goal-flash");
      setTimeout(() => row.classList.remove("goal-flash"), 900);
    }
  });
}

// --------------------------------------------------
// RENDER LIVE PANEL
// --------------------------------------------------
function renderLivePanel(matches) {
  if (!listEl) listEl = document.getElementById("live-matches-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  if (!matches || matches.length === 0) {
    const empty = document.createElement("div");
    empty.className = "placeholder";
    empty.textContent = "No live matches right now.";
    listEl.appendChild(empty);
    return;
  }

  matches.forEach(m => {
    const card = document.createElement("div");
    card.className = "live-card";
    card.dataset.matchId = m.match_id;

    card.innerHTML = `
      <div class="live-header">
        <div class="live-score">${m.score}</div>
        <div class="live-minute">${m.minute || "-"}'</div>
      </div>
      <div class="live-teams">
        ${m.home} vs ${m.away}
      </div>
      <div class="live-meta">
        ${m.league || ""} · ${m.country || ""} · ${m.status || ""}
      </div>
    `;

    listEl.appendChild(card);
  });
}

// --------------------------------------------------
// MAIN REFRESH LOOP
// --------------------------------------------------
async function refreshLive() {
  if (STATE.isRefreshing) return;
  STATE.isRefreshing = true;

  try {
    setStatusLabel("Updating…", "#eab308");
    const matches = await fetchLiveMatches();
    renderLivePanel(matches);
    const ev = detectEvents(matches);
    applyEvents(ev);
    setStatusLabel("Live", "#22c55e");
  } catch (e) {
    console.error("[LIVE] refresh error:", e);
    setStatusLabel("Offline", "#f97373");
  } finally {
    STATE.isRefreshing = false;
  }
}

// --------------------------------------------------
// INIT
// --------------------------------------------------
export function initLiveEngine() {
  listEl = document.getElementById("live-matches-list");
  if (!listEl) {
    console.warn("[LIVE] #live-matches-list not found");
    return;
  }
  getStatusElement();
  refreshLive();
  setInterval(refreshLive, REFRESH_INTERVAL);
}

// Manual refresh for topbar button
export function manualRefreshLive() {
  refreshLive();
}
