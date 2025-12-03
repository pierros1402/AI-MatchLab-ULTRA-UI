// ======================================================================
// AI MATCHLAB ULTRA — LIVE ENGINE (LIVE + TODAY)
// Uses Worker: /api/live-sofascore
// Renders into #live-matches-list (right panel)
// ======================================================================

const WORKER_ENDPOINT =
  "https://live-matches-worker.pierros1402.workers.dev/api/live-sofascore";

const REFRESH_INTERVAL = 20000; // 20s

const STATE = {
  live: [],
  today: [],
  cacheLive: [],
  cacheToday: [],
  isRefreshing: false,
  lastUpdated: null,
  todaySortMode: "hour" // "hour" (default) | "country"
};

let listEl = null;
let statusEl = null;

// ======================================================================
// STATUS INDICATOR
// ======================================================================
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

// ======================================================================
// FETCH HELPERS
// ======================================================================
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

async function fetchFromWorker() {
  const json = await fetchWithTimeout(WORKER_ENDPOINT);
  const live = Array.isArray(json.matches) ? json.matches : [];
  const today = Array.isArray(json.today) ? json.today : [];
  return {
    live: live.map(normaliseMatch),
    today: today.map(m => normaliseMatch(m, true))
  };
}

// Ενιαίο normalisation layer
function normaliseMatch(m, isToday = false) {
  // score
  let homeScore = 0;
  let awayScore = 0;

  if (typeof m.homeScore === "number" && typeof m.awayScore === "number") {
    homeScore = m.homeScore;
    awayScore = m.awayScore;
  } else if (typeof m.score === "string" && m.score.includes("-")) {
    const [h, a] = m.score.split("-");
    homeScore = parseInt(h || "0", 10);
    awayScore = parseInt(a || "0", 10);
  }

  const score = `${homeScore}-${awayScore}`;

  const kickoffTs =
    m.kickoff_ts ??
    m.kickoff ??
    m.startTimestamp ??
    null;

  return {
    match_id: m.match_id || m.id || "",
    home: m.home || m.homeTeam || "",
    home_id: m.home_id ?? m.homeId ?? null,
    away: m.away || m.awayTeam || "",
    away_id: m.away_id ?? m.awayId ?? null,
    score,
    minute: m.minute ?? null,
    status: m.status || (isToday ? "SCHEDULED" : "LIVE"),
    league: m.league || "",
    country: m.country || "",
    kickoff_ts: kickoffTs,
    raw: m
  };
}

// ======================================================================
// GROUP / SORT HELPERS
// ======================================================================
function groupByCountryAndLeague(matches) {
  const groupsMap = new Map();

  matches.forEach(m => {
    const country = m.country || "Other";
    const league = m.league || "Misc";
    const key = `${country} • ${league}`;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, { key, country, league, matches: [] });
    }
    groupsMap.get(key).matches.push(m);
  });

  return Array.from(groupsMap.values()).sort((a, b) => {
    if (a.country === b.country) {
      return a.league.localeCompare(b.league);
    }
    return a.country.localeCompare(b.country);
  });
}

function sortTodayByHour(matches) {
  return [...matches].sort((a, b) => {
    const aTs = a.kickoff_ts ?? 0;
    const bTs = b.kickoff_ts ?? 0;
    return aTs - bTs;
  });
}

function formatKickoff(m) {
  if (!m.kickoff_ts) return "";
  try {
    const d = new Date(m.kickoff_ts * 1000);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "";
  }
}

// ======================================================================
// MATCH DETAILS (CENTER PANEL)
// ======================================================================
function renderMatchDetails(match) {
  const container = document.getElementById("match-details");
  if (!container) return;

  const isLive = match.status?.toUpperCase().includes("LIVE");
  const kickoff = formatKickoff(match);
  const statusLine = isLive
    ? `LIVE · ${match.minute != null ? match.minute + "'" : ""}`
    : kickoff
    ? `Today · ${kickoff}`
    : match.status || "Scheduled";

  const [sh, sa] = match.score.split("-");

  container.innerHTML = `
    <div class="glass-card">
      <div class="match-details-header">
        <div class="text-muted">${match.country || ""}</div>
        <div><strong>${match.league || ""}</strong></div>
      </div>
      <div class="match-details-body">
        <div class="match-team-row">
          <span class="team-name">${match.home}</span>
          <span class="team-score">${sh ?? ""}</span>
        </div>
        <div class="match-team-row">
          <span class="team-name">${match.away}</span>
          <span class="team-score">${sa ?? ""}</span>
        </div>
      </div>
      <div class="match-details-footer">
        <span class="match-status">${statusLine}</span>
        ${
          match.home_id || match.away_id
            ? `<span class="match-ids">IDs: ${match.home_id ?? "-"} vs ${
                match.away_id ?? "-"
              }</span>`
            : ""
        }
      </div>
    </div>
  `;

  const center = document.getElementById("content") || document.getElementById("center-panel");
  if (center) {
    center.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ======================================================================
// RENDERING
// ======================================================================
function ensureListElement() {
  if (listEl) return listEl;
  listEl = document.getElementById("live-matches-list");
  return listEl;
}

function createSectionHeader(text) {
  const h = document.createElement("div");
  h.className = "text-muted";
  h.style.fontWeight = "600";
  h.style.margin = "4px 0";
  h.textContent = text;
  return h;
}

function createTodaySortControls() {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.justifyContent = "flex-end";
  wrap.style.gap = "6px";
  wrap.style.fontSize = "11px";
  wrap.style.marginBottom = "4px";

  const label = document.createElement("span");
  label.textContent = "Sort:";

  const btnHour = document.createElement("button");
  const btnCountry = document.createElement("button");

  btnHour.textContent = "Hour";
  btnCountry.textContent = "Country";

  [btnHour, btnCountry].forEach(btn => {
    btn.style.border = "none";
    btn.style.borderRadius = "999px";
    btn.style.padding = "2px 8px";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "11px";
    btn.style.background = "transparent";
    btn.style.color = "inherit";
  });

  const syncButtons = () => {
    if (STATE.todaySortMode === "hour") {
      btnHour.style.background = "rgba(148,163,184,0.18)";
      btnCountry.style.background = "transparent";
    } else {
      btnCountry.style.background = "rgba(148,163,184,0.18)";
      btnHour.style.background = "transparent";
    }
  };

  btnHour.onclick = () => {
    STATE.todaySortMode = "hour";
    syncButtons();
    renderAllPanels(STATE.live, STATE.today);
  };

  btnCountry.onclick = () => {
    STATE.todaySortMode = "country";
    syncButtons();
    renderAllPanels(STATE.live, STATE.today);
  };

  syncButtons();

  wrap.appendChild(label);
  wrap.appendChild(btnHour);
  wrap.appendChild(btnCountry);
  return wrap;
}

function renderLiveSection(live) {
  const root = ensureListElement();
  if (!root) return;

  root.appendChild(createSectionHeader("LIVE MATCHES"));

  if (!live || live.length === 0) {
    const empty = document.createElement("div");
    empty.className = "placeholder";
    empty.textContent = "No live matches right now.";
    root.appendChild(empty);
    return;
  }

  const grouped = groupByCountryAndLeague(live);
  const mobile = window.innerWidth <= 900;

  grouped.forEach(group => {
    const section = document.createElement("section");
    section.className = "live-group";

    const gHeader = document.createElement("div");
    gHeader.className = "text-muted";
    gHeader.style.fontSize = "12px";
    gHeader.style.marginBottom = "4px";
    gHeader.textContent = group.key;
    section.appendChild(gHeader);

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
        mobile ? "" : m.country ? " · " + m.country : ""
      } · ${m.status || ""}
        </div>
      `;

      card.onclick = () => renderMatchDetails(m);
      section.appendChild(card);
    });

    root.appendChild(section);
  });
}

function renderTodaySection(today) {
  const root = ensureListElement();
  if (!root) return;

  const headerRow = document.createElement("div");
  headerRow.style.display = "flex";
  headerRow.style.alignItems = "center";
  headerRow.style.justifyContent = "space-between";
  headerRow.style.marginTop = "10px";

  const header = createSectionHeader("TODAY MATCHES");
  headerRow.appendChild(header);
  headerRow.appendChild(createTodaySortControls());

  root.appendChild(headerRow);

  if (!today || today.length === 0) {
    const empty = document.createElement("div");
    empty.className = "placeholder";
    empty.textContent = "No scheduled matches for today.";
    root.appendChild(empty);
    return;
  }

  if (STATE.todaySortMode === "hour") {
    const sorted = sortTodayByHour(today);
    sorted.forEach(m => {
      const card = document.createElement("div");
      card.className = "live-card";
      const kickoff = formatKickoff(m) || "--:--";
      card.innerHTML = `
        <div class="live-header">
          <div class="live-score">${kickoff}</div>
          <div class="live-minute">${m.status || "SCHEDULED"}</div>
        </div>
        <div class="live-teams">
          ${m.home} vs ${m.away}
        </div>
        <div class="live-meta">
          ${m.league || ""}${m.country ? " · " + m.country : ""}
        </div>
      `;
      card.onclick = () => renderMatchDetails(m);
      root.appendChild(card);
    });
  } else {
    // sort: country → league → kickoff time
    const grouped = groupByCountryAndLeague(today);
    grouped.forEach(group => {
      const section = document.createElement("section");
      section.className = "today-group";

      const gHeader = document.createElement("div");
      gHeader.className = "text-muted";
      gHeader.style.fontSize = "12px";
      gHeader.style.marginBottom = "4px";
      gHeader.textContent = group.key;
      section.appendChild(gHeader);

      const sorted = sortTodayByHour(group.matches);
      sorted.forEach(m => {
        const card = document.createElement("div");
        card.className = "live-card";
        const kickoff = formatKickoff(m) || "--:--";
        card.innerHTML = `
          <div class="live-header">
            <div class="live-score">${kickoff}</div>
            <div class="live-minute">${m.status || "SCHEDULED"}</div>
          </div>
          <div class="live-teams">
            ${m.home} vs ${m.away}
          </div>
          <div class="live-meta">
            ${m.league || ""}
          </div>
        `;
        card.onclick = () => renderMatchDetails(m);
        section.appendChild(card);
      });

      root.appendChild(section);
    });
  }
}

function renderAllPanels(live, today) {
  const root = ensureListElement();
  if (!root) return;
  root.innerHTML = "";

  const src = document.createElement("div");
  src.className = "text-muted";
  src.style.fontSize = "11px";
  src.style.marginBottom = "4px";
  src.textContent = "Source: AIML LIVE WORKER";
  root.appendChild(src);

  if ((!live || live.length === 0) && (!today || today.length === 0)) {
    const empty = document.createElement("div");
    empty.className = "placeholder";
    empty.textContent = "No live or today matches available.";
    root.appendChild(empty);
    return;
  }

  renderLiveSection(live);
  renderTodaySection(today);
}

// ======================================================================
// MAIN REFRESH LOOP
// ======================================================================
async function refreshLive() {
  if (STATE.isRefreshing) return;
  STATE.isRefreshing = true;

  try {
    setStatusLabel("Updating…", "#eab308");

    const { live, today } = await fetchFromWorker();

    STATE.live = live;
    STATE.today = today;
    STATE.cacheLive = live;
    STATE.cacheToday = today;
    STATE.lastUpdated = Date.now();

    renderAllPanels(live, today);

    setStatusLabel("Live", "#22c55e");
  } catch (e) {
    console.error("[LIVE] refresh error:", e);
    setStatusLabel("Offline", "#f97373");

    if (STATE.cacheLive.length || STATE.cacheToday.length) {
      renderAllPanels(STATE.cacheLive, STATE.cacheToday);
    }
  } finally {
    STATE.isRefreshing = false;
  }
}

// ======================================================================
// PUBLIC API
// ======================================================================
export function initLiveEngine() {
  listEl = document.getElementById("live-matches-list");
  if (!listEl) {
    console.warn("[LIVE] #live-matches-list not found");
    return;
  }
  getStatusElement();
  refreshLive();
  setInterval(refreshLive, REFRESH_INTERVAL);

  window.addEventListener("resize", () => {
    if (STATE.live.length || STATE.today.length) {
      renderAllPanels(STATE.live, STATE.today);
    }
  });
}

export function manualRefreshLive() {
  refreshLive();
}
