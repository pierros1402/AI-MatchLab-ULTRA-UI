// ======================================================================
// AI MATCHLAB ULTRA — UNIFIED LIVE ENGINE (DARK/LIGHT READY)
// Source A: Cloudflare Worker (OpenLigaDB-normalised)
//   https://live-matches-worker.pierros1402.workers.dev/api/live-matches
//
// Source B: Sofascore LIVE feed (global coverage)
//   https://api.sofascore.com/api/v1/sport/football/events/live
//
// Renders into #live-matches-list as .live-card tiles
// ======================================================================

// ---- ENDPOINTS -------------------------------------------------------
const WORKER_ENDPOINT =
  "https://live-matches-worker.pierros1402.workers.dev/api/live-matches";

const SOFASCORE_ENDPOINT =
  "https://api.sofascore.com/api/v1/sport/football/events/live";

const REFRESH_INTERVAL = 20000; // 20s

// ---- STATE -----------------------------------------------------------
const STATE = {
  cache: [], // always in unified / normalised format
  previousSnapshot: {},
  isRefreshing: false,
  lastSource: null // 'worker' | 'sofascore' | 'cache'
};

let listEl = null;
let statusEl = null;

// =====================================================================
// STATUS INDICATOR
// =====================================================================
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

// =====================================================================
// FETCH HELPERS
// =====================================================================
async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store"
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// ---- Source A: Worker (ήδη normalised) -------------------------------
async function fetchFromWorker() {
  try {
    const json = await fetchWithTimeout(WORKER_ENDPOINT);
    const matches = (json && Array.isArray(json.matches)) ? json.matches : [];

    // Βάζουμε flag source + εξασφαλίζουμε consistent fields
    const normalised = matches.map(m => ({
      source: "worker",
      match_id: m.match_id || m.id || "",
      home: m.home || m.homeTeam || "",
      away: m.away || m.awayTeam || "",
      score: m.score || `${m.homeScore ?? 0}-${m.awayScore ?? 0}`,
      minute: m.minute ?? null,
      status: m.status || "",
      league: m.league || "",
      country: m.country || "",
      // reserved για future timeline
      provider_meta: m.provider_meta || null
    }));

    return normalised;
  } catch (err) {
    console.warn("[LIVE] Worker source failed:", err);
    return [];
  }
}

// ---- Source B: Sofascore live ---------------------------------------
function normaliseSofascoreEvents(json) {
  if (!json || !Array.isArray(json.events)) return [];

  return json.events.map(ev => {
    const leagueName = ev.tournament?.name || "";
    const countryName =
      ev.tournament?.category?.country?.name ||
      ev.tournament?.category?.name ||
      "";

    const homeName = ev.homeTeam?.name || "";
    const awayName = ev.awayTeam?.name || "";

    const homeScore =
      (ev.homeScore && (ev.homeScore.current ?? ev.homeScore.display)) ?? 0;
    const awayScore =
      (ev.awayScore && (ev.awayScore.current ?? ev.awayScore.display)) ?? 0;

    const score = `${homeScore}-${awayScore}`;

    // Minute estimation: Sofascore έχει διάφορα πεδία – παίρνουμε ό,τι υπάρχει
    const rawMinute =
      ev.time?.currentPeriodMinute ??
      ev.time?.minute ??
      ev.time?.regularTimeMinute ??
      null;

    const status =
      ev.status?.description ||
      ev.status?.type ||
      ev.status?.code ||
      "";

    return {
      source: "sofascore",
      match_id: `SF-${ev.id}`, // για να μην συγκρούεται με άλλα ids
      home: homeName,
      away: awayName,
      score,
      minute: rawMinute,
      status,
      league: leagueName,
      country: countryName,
      provider_meta: {
        sofascoreId: ev.id,
        tournamentId: ev.tournament?.id,
        slug: ev.slug
      }
    };
  });
}

async function fetchFromSofascore() {
  try {
    const json = await fetchWithTimeout(SOFASCORE_ENDPOINT);
    const normalised = normaliseSofascoreEvents(json);
    return normalised;
  } catch (err) {
    console.warn("[LIVE] Sofascore source failed:", err);
    return [];
  }
}

// ---- Unified fetch / fallback chain ---------------------------------
async function fetchUnifiedLiveMatches() {
  // 1) Προσπαθούμε πρώτα τον δικό σου worker
  const workerMatches = await fetchFromWorker();
  if (workerMatches.length > 0) {
    STATE.lastSource = "worker";
    return workerMatches;
  }

  // 2) Αν δεν έχει τίποτα ο worker, πέφτουμε στο Sofascore
  const sofaMatches = await fetchFromSofascore();
  if (sofaMatches.length > 0) {
    STATE.lastSource = "sofascore";
    return sofaMatches;
  }

  // 3) Τελευταίο fallback: cache
  STATE.lastSource = "cache";
  return STATE.cache;
}

// =====================================================================
// EVENT DETECTION (goals + status changes)
// =====================================================================
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

// =====================================================================
// GROUPING (country • league) — για πιο καθαρό UI
// =====================================================================
function groupMatches(matches) {
  const groupsMap = new Map();

  matches.forEach(m => {
    const country = m.country || "Other";
    const league = m.league || "Misc";
    const key = `${country} • ${league}`;

    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        key,
        country,
        league,
        matches: []
      });
    }
    groupsMap.get(key).matches.push(m);
  });

  // ταξινόμηση: χώρα αλφαβητικά, μετά league
  return Array.from(groupsMap.values()).sort((a, b) => {
    if (a.country === b.country) {
      return a.league.localeCompare(b.league);
    }
    return a.country.localeCompare(b.country);
  });
}

// =====================================================================
// RENDERING (desktop / mobile share ίδια cards, απλά grouped)
// =====================================================================
function isMobileLayout() {
  return window.innerWidth <= 900;
}

function renderLivePanel(matches) {
  if (!listEl) listEl = document.getElementById("live-matches-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  // Source badge (πάνω από όλα)
  if (STATE.lastSource) {
    const src = document.createElement("div");
    src.className = "text-muted";
    src.style.fontSize = "11px";
    src.style.marginBottom = "4px";
    src.textContent =
      STATE.lastSource === "worker"
        ? "Source: OpenLiga (Worker)"
        : STATE.lastSource === "sofascore"
        ? "Source: Sofascore LIVE"
        : "Source: cache";
    listEl.appendChild(src);
  }

  if (!matches || matches.length === 0) {
    const empty = document.createElement("div");
    empty.className = "placeholder";
    empty.textContent = "No live matches right now.";
    listEl.appendChild(empty);
    return;
  }

  const grouped = groupMatches(matches);
  const mobile = isMobileLayout();

  grouped.forEach(group => {
    const section = document.createElement("section");
    section.className = "live-group";

    const header = document.createElement("div");
    header.className = "live-group-header";
    header.textContent = group.key;
    section.appendChild(header);

    group.matches.forEach(m => {
      const card = document.createElement("div");
      card.className = "live-card";
      card.dataset.matchId = m.match_id;

      card.innerHTML = `
        <div class="live-header">
          <div class="live-score">${m.score}</div>
          <div class="live-minute">${m.minute != null ? m.minute : "-"}'</div>
        </div>
        <div class="live-teams">
          ${m.home} vs ${m.away}
        </div>
        <div class="live-meta">
          ${m.league || ""}${
            mobile ? "" : (m.country ? " · " + m.country : "")
          } · ${m.status || ""}
        </div>
      `;

      section.appendChild(card);
    });

    listEl.appendChild(section);
  });
}

// =====================================================================
// MAIN REFRESH LOOP
// =====================================================================
async function refreshLive() {
  if (STATE.isRefreshing) return;
  STATE.isRefreshing = true;

  try {
    setStatusLabel("Updating…", "#eab308");
    const matches = await fetchUnifiedLiveMatches();

    // cache πάντα σε unified μορφή
    STATE.cache = matches;

    renderLivePanel(matches);

    const ev = detectEvents(matches);
    applyEvents(ev);
    setStatusLabel("Live", "#22c55e");
  } catch (e) {
    console.error("[LIVE] refresh error:", e);
    setStatusLabel("Offline", "#f97373");

    // αν αποτύχουν όλα, δείξε ό,τι έχει η cache
    if (STATE.cache.length) {
      renderLivePanel(STATE.cache);
    }
  } finally {
    STATE.isRefreshing = false;
  }
}

// =====================================================================
// INIT
// =====================================================================
export function initLiveEngine() {
  listEl = document.getElementById("live-matches-list");
  if (!listEl) {
    console.warn("[LIVE] #live-matches-list not found");
    return;
  }
  getStatusElement();
  refreshLive();
  setInterval(refreshLive, REFRESH_INTERVAL);

  // re-render on resize για καλύτερο mobile/desktop layout
  window.addEventListener("resize", () => {
    if (STATE.cache && STATE.cache.length) {
      renderLivePanel(STATE.cache);
    }
  });
}

// Manual refresh for topbar button
export function manualRefreshLive() {
  refreshLive();
}
