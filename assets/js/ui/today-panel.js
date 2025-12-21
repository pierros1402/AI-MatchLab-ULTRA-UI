/* assets/js/ui/today-panel.js */
/* v1.8 — Athens time display + top-leagues priority (no hard filtering) */

(function () {
  "use strict";

  const TZ = "Europe/Athens";
  const CACHE_NS = "AIML_TODAY_V18";
  const CACHE_DAY_KEY = CACHE_NS + ":DAY";
  const CACHE_TTL_MS = 60 * 1000; // 60s

  const panel = document.getElementById("panel-today");
  const listEl = document.getElementById("today-list");
  if (!panel || !listEl) return;

  // ---------------------------
  // Time helpers (Athens)
  // ---------------------------
  const fmtAthensTime = new Intl.DateTimeFormat("el-GR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const fmtAthensDateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }); // yields YYYY-MM-DD

  const fmtAthensWeekdayShort = new Intl.DateTimeFormat("el-GR", {
    timeZone: TZ,
    weekday: "short"
  });

  function asDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;

    // If string is ISO without timezone, treat as UTC by appending "Z"
    if (typeof value === "string") {
      const s = value.trim();
      const looksIsoNoTz =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{1,3})?$/.test(s);
      const hasTz = /[zZ]$|[+\-]\d{2}:\d{2}$/.test(s);
      try {
        return new Date(looksIsoNoTz && !hasTz ? s + "Z" : s);
      } catch (_) {
        return null;
      }
    }

    try {
      return new Date(value);
    } catch (_) {
      return null;
    }
  }

  function athensDateKeyFrom(value) {
    const d = asDate(value);
    if (!d || isNaN(d.getTime())) return "";
    return fmtAthensDateKey.format(d);
  }

  function athensTimeFrom(value) {
    const d = asDate(value);
    if (!d || isNaN(d.getTime())) return "--:--";
    return fmtAthensTime.format(d);
  }

  // ---------------------------
  // League priority (Top 5 + Greece first, NOT filter-only)
  // ---------------------------
  const LEAGUE_PRIORITY = ["GRE.1", "ENG.1", "ESP.1", "GER.1", "ITA.1", "FRA.1"]; // ESPN slugs
  const LEAGUE_LABELS = {
    "GRE.1": "Greece",
    "ENG.1": "EPL",
    "ESP.1": "LaLiga",
    "GER.1": "Bundesliga",
    "ITA.1": "Serie A",
    "FRA.1": "Ligue 1"
  };

  function canonLeague(m) {
    const raw =
      (m && (m.leagueSlug || m.leagueCode || m.league || m.competition || m.tournament)) || "";
    const s = String(raw).trim();

    // If ESPN slug already:
    const up = s.toUpperCase();

    // Common normalizations
    if (up.includes("GRE.1") || up.includes("GREECE") || up.includes("SUPER LEAGUE")) return "GRE.1";
    if (up.includes("ENG.1") || up.includes("EPL") || up.includes("PREMIER")) return "ENG.1";
    if (up.includes("ESP.1") || up.includes("LALIGA") || up.includes("LA LIGA")) return "ESP.1";
    if (up.includes("GER.1") || up.includes("BUNDESLIGA")) return "GER.1";
    if (up.includes("ITA.1") || up.includes("SERIE A")) return "ITA.1";
    if (up.includes("FRA.1") || up.includes("LIGUE 1")) return "FRA.1";

    // Your older internal codes (if present)
    if (up === "PL") return "ENG.1";
    if (up === "PD") return "ESP.1";
    if (up === "BL1") return "GER.1";
    if (up === "SA") return "ITA.1";
    if (up === "FL1") return "FRA.1";
    if (up.includes("GR") || up.includes("GRC")) return "GRE.1";

    return s || "OTHER";
  }

  function leagueRank(code) {
    const idx = LEAGUE_PRIORITY.indexOf(code);
    return idx === -1 ? 999 : idx;
  }

  function leagueLabel(code, fallback) {
    return LEAGUE_LABELS[code] || fallback || code || "";
  }

  // ---------------------------
  // DOM: toolbar (dropdown days + saved only)
  // ---------------------------
  let toolbar = panel.querySelector(".today-toolbar");
  let selDay = document.getElementById("today-day-select");
  let chkSavedOnly = document.getElementById("today-saved-only");
  let btnRefresh = document.getElementById("today-refresh-btn");

  if (!toolbar) {
    toolbar = document.createElement("div");
    toolbar.className = "today-toolbar";
    toolbar.style.display = "flex";
    toolbar.style.gap = "8px";
    toolbar.style.alignItems = "center";
    toolbar.style.padding = "8px 0";

    toolbar.innerHTML = `
      <select id="today-day-select" class="select" style="max-width: 180px;"></select>
      <label class="chk" style="display:flex;align-items:center;gap:6px;opacity:.9;">
        <input type="checkbox" id="today-saved-only" />
        <span>Saved only</span>
      </label>
      <button id="today-refresh-btn" class="btn" type="button" style="margin-left:auto;">Refresh</button>
    `;

    panel.insertBefore(toolbar, listEl);
  }

  selDay = document.getElementById("today-day-select");
  chkSavedOnly = document.getElementById("today-saved-only");
  btnRefresh = document.getElementById("today-refresh-btn");

  // ---------------------------
  // State
  // ---------------------------
  const state = {
    dateKey: "",
    savedOnly: false,
    matches: []
  };

  // ---------------------------
  // Cache helpers (daily cleanup)
  // ---------------------------
  function todayAthensKey() {
    return athensDateKeyFrom(new Date());
  }

  function cleanupIfNewDay() {
    const todayKey = todayAthensKey();
    const lastDay = localStorage.getItem(CACHE_DAY_KEY);
    if (lastDay && lastDay === todayKey) return;

    // New day: clear our namespace
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.indexOf(CACHE_NS + ":") === 0) localStorage.removeItem(k);
      }
      localStorage.setItem(CACHE_DAY_KEY, todayKey);
    } catch (_) {
      // ignore
    }
  }

  function cacheKeyFor(dateKey) {
    return CACHE_NS + ":" + dateKey;
  }

  function readCache(dateKey) {
    try {
      const raw = localStorage.getItem(cacheKeyFor(dateKey));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.ts || !Array.isArray(obj.matches)) return null;
      if (Date.now() - obj.ts > CACHE_TTL_MS) return null;
      return obj.matches;
    } catch (_) {
      return null;
    }
  }

  function writeCache(dateKey, matches) {
    try {
      localStorage.setItem(cacheKeyFor(dateKey), JSON.stringify({ ts: Date.now(), matches: matches || [] }));
    } catch (_) {
      // ignore
    }
  }

  // ---------------------------
  // Fetch fixtures (fallback-first)
  // ---------------------------
  function baseUrl() {
    const cfg = window.AIML_LIVE_CFG || {};
    const b = (cfg.liveUltraBase || cfg.fixturesBase || "").trim();
    return b ? b.replace(/\/+$/, "") : "";
  }

  async function safeJson(url) {
    try {
      const res = await fetch(url, { method: "GET", cache: "no-store", mode: "cors" });
      if (!res.ok) return null;
      return await res.json();
    } catch (_) {
      return null;
    }
  }

  function extractArray(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.matches)) return payload.matches;
    if (Array.isArray(payload.fixtures)) return payload.fixtures;
    if (Array.isArray(payload.events)) return payload.events;
    return [];
  }

  function normalizeRaw(raw) {
    // We accept multiple schemas (your worker unified JSON or other)
    const id = raw.id || raw.matchId || raw.fixtureId || raw.eventId || (raw.home && raw.away ? (raw.home + "-" + raw.away + "-" + (raw.kickoff || raw.start || raw.date || "")) : ("m_" + Math.random()));
    const home = raw.home?.name || raw.homeName || raw.home || raw.teamHome || raw.home_team || raw.h || "";
    const away = raw.away?.name || raw.awayName || raw.away || raw.teamAway || raw.away_team || raw.a || "";
    const kickoff =
      raw.kickoff ||
      raw.kickoffISO ||
      raw.startDate ||
      raw.start ||
      raw.date ||
      raw.utc ||
      raw.ts ||
      raw.time ||
      "";
    const league =
      raw.league?.name ||
      raw.leagueName ||
      raw.competition?.name ||
      raw.competitionName ||
      raw.tournament ||
      raw.league ||
      raw.competition ||
      "";
    const leagueSlug =
      raw.leagueSlug ||
      raw.leagueCode ||
      raw.competition?.slug ||
      raw.competitionSlug ||
      raw.slug ||
      "";
    const status = raw.status?.state || raw.status || raw.state || "";
    const minute = raw.minute || raw.clock || raw.displayClock || "";
    const scoreHome = raw.scoreHome ?? raw.homeScore ?? raw.score?.home ?? raw.home_score ?? "";
    const scoreAway = raw.scoreAway ?? raw.awayScore ?? raw.score?.away ?? raw.away_score ?? "";

    const title = (home && away) ? (home + " - " + away) : (raw.title || raw.name || "Match");

    return {
      id: String(id),
      home: String(home),
      away: String(away),
      title: String(title),
      kickoff: kickoff,
      leagueName: String(league),
      leagueSlug: String(leagueSlug),
      status: String(status),
      minute: String(minute),
      scoreHome: scoreHome,
      scoreAway: scoreAway
    };
  }

  function isSameDayAthens(match, dateKey) {
    const dk = athensDateKeyFrom(match.kickoff);
    return dk && dateKey && dk === dateKey;
  }

  async function fetchFixturesForDate(dateKey) {
    const b = baseUrl();
    if (!b) return [];

    // Try common query parameter names; fall back to /fixtures without params.
    const tries = [
      b + "/fixtures?date=" + encodeURIComponent(dateKey),
      b + "/fixtures?day=" + encodeURIComponent(dateKey),
      b + "/fixtures?d=" + encodeURIComponent(dateKey),
      b + "/fixtures"
    ];

    let lastPayload = null;

    for (let i = 0; i < tries.length; i++) {
      const payload = await safeJson(tries[i]);
      if (!payload) continue;
      lastPayload = payload;

      const arr = extractArray(payload).map(normalizeRaw).filter((m) => isSameDayAthens(m, dateKey));
      if (arr.length) return arr;
    }

    // If the endpoint returns a week list without params, try filtering it
    if (lastPayload) {
      const arr = extractArray(lastPayload).map(normalizeRaw).filter((m) => isSameDayAthens(m, dateKey));
      return arr;
    }

    return [];
  }

  // ---------------------------
  // Render
  // ---------------------------
  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function isSaved(id) {
    try {
      return !!(window.SavedStore && typeof window.SavedStore.isSaved === "function" && window.SavedStore.isSaved(id));
    } catch (_) {
      return false;
    }
  }

  function toggleSave(match) {
    try {
      if (window.SavedStore && typeof window.SavedStore.toggle === "function") {
        window.SavedStore.toggle(match);
      } else if (window.SavedStore && typeof window.SavedStore.toggleSave === "function") {
        window.SavedStore.toggleSave(match);
      }
    } catch (_) {
      // ignore
    }
  }

  function emit(name, payload) {
    try {
      if (typeof window.emit === "function") window.emit(name, payload);
    } catch (_) {
      // ignore
    }
  }

  function render() {
    let arr = Array.isArray(state.matches) ? state.matches.slice() : [];

    if (state.savedOnly) {
      arr = arr.filter((m) => isSaved(m.id));
    }

    // Enrich + sort: Top leagues first, then kickoff time
    arr.forEach((m) => {
      m._canon = canonLeague(m);
      m._rank = leagueRank(m._canon);
      m._time = asDate(m.kickoff)?.getTime?.() || 0;
    });

    arr.sort((a, b) => {
      if (a._rank !== b._rank) return a._rank - b._rank;
      return (a._time || 0) - (b._time || 0);
    });

    if (!arr.length) {
      listEl.innerHTML = `<div class="empty" style="opacity:.8;padding:10px 0;">No matches for this day.</div>`;
      emit("today-matches:loaded", { dateKey: state.dateKey, matches: [] });
      return;
    }

    listEl.innerHTML = arr
      .map((m) => {
        const t = athensTimeFrom(m.kickoff);
        const code = m._canon || canonLeague(m);
        const lbl = leagueLabel(code, m.leagueName);
        const saved = isSaved(m.id);

        const score =
          (m.scoreHome !== "" && m.scoreAway !== "")
            ? `<span class="score" style="opacity:.95;">${esc(m.scoreHome)}-${esc(m.scoreAway)}</span>`
            : "";

        const metaParts = [];
        if (lbl) metaParts.push(lbl);
        if (m.minute && String(m.minute).indexOf("'") !== -1) metaParts.push(m.minute);
        else if (m.status && m.status.toLowerCase() !== "scheduled") metaParts.push(m.status);

        const meta = metaParts.length ? metaParts.join(" • ") : "";

        return `
          <div class="match-row row" data-mid="${esc(m.id)}" data-title="${esc(m.title)}" style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
            <div class="match-time time" style="min-width:52px;opacity:.9;">${esc(t)}</div>
            <div class="match-main" style="flex:1;min-width:0;">
              <div class="match-teams teams" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(m.home)} <span class="vs" style="opacity:.7;">-</span> ${esc(m.away)} ${score}</div>
              <div class="match-meta meta" style="font-size:12px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(meta)}</div>
            </div>
            <div class="match-actions actions" style="display:flex;gap:8px;align-items:center;">
              <button class="icon-btn btn-save" data-act="save" title="Save" style="all:unset;cursor:pointer;opacity:${saved ? "1" : ".65"};">${saved ? "★" : "☆"}</button>
              <button class="icon-btn btn-details" data-act="details" title="Details" style="all:unset;cursor:pointer;opacity:.75;">i</button>
            </div>
          </div>
        `;
      })
      .join("");

    emit("today-matches:loaded", { dateKey: state.dateKey, matches: arr });
  }

  // ---------------------------
  // Interaction
  // ---------------------------
  function handleRowClick(e) {
    const row = e.target.closest(".match-row");
    if (!row) return;

    const act = e.target && e.target.getAttribute && e.target.getAttribute("data-act");
    const mid = row.getAttribute("data-mid") || "";
    const match = state.matches.find((m) => String(m.id) === String(mid));
    if (!match) return;

    if (act === "save") {
      e.preventDefault();
      e.stopPropagation();
      toggleSave(match);
      render();
      return;
    }

    if (act === "details") {
      e.preventDefault();
      e.stopPropagation();
      emit("details-open", match);
      return;
    }

    // Default: select match
    emit("match-selected", match);
  }

  // ---------------------------
  // Dropdown build
  // ---------------------------
  function buildDayOptions() {
    const base = new Date();
    const baseKey = todayAthensKey();

    const opts = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(base.getTime() + i * 86400000);
      const key = athensDateKeyFrom(d);
      const label = i === 0 ? "Σήμερα" : fmtAthensWeekdayShort.format(d);
      opts.push({ key: key, label: label });
    }

    selDay.innerHTML = opts
      .map((o) => `<option value="${esc(o.key)}"${o.key === baseKey ? " selected" : ""}>${esc(o.label)} (${esc(o.key)})</option>`)
      .join("");

    state.dateKey = selDay.value || baseKey;
  }

  // ---------------------------
  // Load
  // ---------------------------
  async function load(dateKey, force) {
    state.dateKey = dateKey;

    if (!force) {
      const cached = readCache(dateKey);
      if (cached) {
        state.matches = cached;
        render();
        return;
      }
    }

    listEl.innerHTML = `<div style="opacity:.8;padding:10px 0;">Loading…</div>`;

    const arr = await fetchFixturesForDate(dateKey);
    state.matches = Array.isArray(arr) ? arr : [];
    writeCache(dateKey, state.matches);
    render();
  }

  // ---------------------------
  // Boot
  // ---------------------------
  cleanupIfNewDay();
  buildDayOptions();

  // events
  listEl.addEventListener("click", handleRowClick);

  if (selDay) {
    selDay.addEventListener("change", function () {
      const dk = selDay.value || todayAthensKey();
      load(dk, false);
    });
  }

  if (chkSavedOnly) {
    chkSavedOnly.addEventListener("change", function () {
      state.savedOnly = !!chkSavedOnly.checked;
      render();
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener("click", function () {
      const dk = selDay && selDay.value ? selDay.value : todayAthensKey();
      load(dk, true);
    });
  }

  // keep saved stars in sync
  try {
    if (typeof window.on === "function") {
      window.on("saved-store:updated", function () {
        render();
      });
    }
  } catch (_) {}

  // initial load
  load(state.dateKey || todayAthensKey(), false);
})();
