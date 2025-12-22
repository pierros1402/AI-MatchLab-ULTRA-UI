/* ============================================================
   Matches Panel v3.0 FINAL (ESPN-only)
   - On league-selected: opens Matches panel
   - Renders ONLY matches coming from ESPN (/fixtures) that match selected leagueId
   - No demo fallback
   - Saved-only toggle + Save + Details
============================================================ */
(function () {
  "use strict";

  const panel = document.getElementById("panel-matches");
  const listEl = document.getElementById("matches-list");
  if (!panel || !listEl) return;

  const state = {
    league: null,          // {id,name,...}
    savedOnly: false,
    matches: [],
    lastToday: { dateKey: "", items: [] }
  };

  // ---------- helpers ----------
  const esc = (s) =>
    String(s == null ? "" : s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  function pad2(n) {
    const x = Number(n) || 0;
    return x < 10 ? "0" + x : String(x);
  }

  function ymdInAthens(d) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Athens",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).formatToParts(d);
      const map = Object.create(null);
      parts.forEach((p) => (map[p.type] = p.value));
      return `${map.year}-${map.month}-${map.day}`;
    } catch (_) {
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }
  }

  function kickoffMs(m) {
    const km =
      (m && (m.kickoff_ms || m.kickoffMs)) ||
      (m && typeof m.kickoff === "number" ? m.kickoff : null);
    if (typeof km === "number" && isFinite(km) && km > 0) return km;

    const k1 = m && (m.kickoff || m.kickoffISO || m.utcDate || m.start || m.startDate || m.date);
    if (k1) {
      const t = Date.parse(String(k1));
      if (isFinite(t) && t > 0) return t;
    }
    return 0;
  }

  function athensHHMMFromKickoff(k) {
    const ms = kickoffMs({ kickoff: k, kickoff_ms: (typeof k === "number" ? k : null) });
    if (!ms) return "--:--";
    try {
      const parts = new Intl.DateTimeFormat("el-GR", {
        timeZone: "Europe/Athens",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).formatToParts(new Date(ms));
      const map = Object.create(null);
      parts.forEach((p) => (map[p.type] = p.value));
      return `${map.hour}:${map.minute}`;
    } catch (_) {
      const d = new Date(ms);
      return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }
  }

  function tnDisplay(name) {
    const TN = window.TeamNames;
    return (TN && typeof TN.display === "function") ? TN.display(name) : String(name || "");
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
      if (window.SavedStore && typeof window.SavedStore.toggleSave === "function") {
        window.SavedStore.toggleSave(match);
      }
    } catch (_) {}
  }

  function emit(name, payload) {
    try { if (window.emit) window.emit(name, payload); } catch (_) {}
  }
  function on(name, fn) {
    try { if (window.on) window.on(name, fn); } catch (_) {}
  }

  function baseUrl() {
    const b =
      (window.AIML_LIVE_CFG && (window.AIML_LIVE_CFG.liveUltraBase || window.AIML_LIVE_CFG.base)) ||
      "";
    return String(b || "").replace(/\/+$/, "");
  }

  async function safeJson(url) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      const t = await r.text();
      return JSON.parse(t);
    } catch (_) {
      return null;
    }
  }

  function extractArray(p) {
    if (!p) return [];
    if (Array.isArray(p)) return p;
    if (Array.isArray(p.matches)) return p.matches;
    if (Array.isArray(p.items)) return p.items;
    if (Array.isArray(p.data)) return p.data;
    return [];
  }

  function normalizeMatch(raw) {
    const id =
      raw?.id || raw?.matchId || raw?.fixtureId || raw?.eventId || raw?.uid ||
      (raw?.home && raw?.away && raw?.kickoff ? `${raw.home}-${raw.away}-${raw.kickoff}` : "") ||
      "m_" + Math.random().toString(16).slice(2);

    const home =
      raw?.home?.name || raw?.homeName || raw?.home || raw?.teamHome || raw?.home_team || "";

    const away =
      raw?.away?.name || raw?.awayName || raw?.away || raw?.teamAway || raw?.away_team || "";

    const kickoff =
      raw?.kickoff || raw?.kickoffISO || raw?.utcDate || raw?.startDate || raw?.start || raw?.date || "";

    const leagueName =
      raw?.league?.name || raw?.leagueName || raw?.competition?.name || raw?.competitionName || raw?.tournament?.name || raw?.tournamentName || raw?.league_name || "";

    const leagueSlug =
      raw?.leagueSlug || raw?.leagueCode || raw?.competitionSlug || raw?.tournamentSlug || raw?.slug || "";

    const status = raw?.status || raw?.state || raw?.stage || "";

    const scoreHome = (raw?.scoreHome ?? raw?.homeScore ?? raw?.score_home ?? raw?.goalsHome);
    const scoreAway = (raw?.scoreAway ?? raw?.awayScore ?? raw?.score_away ?? raw?.goalsAway);

    const m = {
      id: String(id),
      home: String(home || ""),
      away: String(away || ""),
      kickoff: kickoff,
      kickoff_ms: raw?.kickoff_ms || raw?.kickoffMs || null,
      leagueName: String(leagueName || ""),
      leagueSlug: String(leagueSlug || ""),
      leagueId: raw?.leagueId || raw?.league_id || "",
      status: String(status || ""),
      minute: String(raw?.minute || raw?.clock || raw?.timeText || ""),
      scoreHome: (scoreHome == null ? "" : String(scoreHome)),
      scoreAway: (scoreAway == null ? "" : String(scoreAway))
    };

    // Enrich via LeagueBinding (maps ESPN → accordion leagueId)
    try {
      if (window.LeagueBinding && typeof window.LeagueBinding.enrichMatch === "function") {
        window.LeagueBinding.enrichMatch(m);
      }
    } catch (_) {}

    return m;
  }

  function matchLeagueEquals(m, league) {
    if (!m || !league) return false;

    const lid = String(league.id || "").trim();
    if (lid && String(m.leagueId || "").trim() === lid) return true;

    // fallback name match
    const a = String(m.leagueName || "").toLowerCase().trim();
    const b = String(league.name || "").toLowerCase().trim();
    if (a && b && a === b) return true;

    return false;
  }

  // ---------- UI ----------
  function ensureToolbar() {
    let toolbar = panel.querySelector(".matches-toolbar");
    if (!toolbar) {
      toolbar = document.createElement("div");
      toolbar.className = "matches-toolbar";
      toolbar.style.display = "flex";
      toolbar.style.alignItems = "center";
      toolbar.style.gap = "8px";
      toolbar.style.padding = "8px 0";
      panel.insertBefore(toolbar, listEl);
    }

    let btnSaved = document.getElementById("matches-saved-only");
    if (!btnSaved) {
      btnSaved = document.createElement("button");
      btnSaved.id = "matches-saved-only";
      btnSaved.className = "btn";
      btnSaved.type = "button";
      btnSaved.textContent = "Saved only";
      toolbar.appendChild(btnSaved);
      btnSaved.addEventListener("click", () => {
        state.savedOnly = !state.savedOnly;
        btnSaved.classList.toggle("active", state.savedOnly);
        render();
      });
    }

    let meta = document.getElementById("matches-meta");
    if (!meta) {
      meta = document.createElement("div");
      meta.id = "matches-meta";
      meta.style.marginLeft = "auto";
      meta.style.opacity = ".75";
      meta.style.fontSize = "12px";
      toolbar.appendChild(meta);
    }
  }

  function setMeta(text) {
    const meta = document.getElementById("matches-meta");
    if (meta) meta.textContent = text || "";
  }

  function render() {
    ensureToolbar();

    const leagueName = state.league ? (state.league.name || state.league.id || "") : "";
    const all = Array.isArray(state.matches) ? state.matches.slice() : [];

    const arr = state.savedOnly ? all.filter((m) => isSaved(m.id)) : all;
    arr.sort((a, b) => (kickoffMs(a) || 0) - (kickoffMs(b) || 0));

    setMeta(leagueName ? `${leagueName} • ${arr.length}` : `${arr.length}`);

    if (!state.league) {
      listEl.innerHTML = `<div class="muted" style="padding:10px;opacity:.75;">Select a league to view ESPN matches.</div>`;
      return;
    }

    if (!arr.length) {
      listEl.innerHTML = `<div class="muted" style="padding:10px;opacity:.75;">No ESPN matches for this league today.</div>`;
      return;
    }

    listEl.innerHTML = arr.map((m) => {
      const timeTxt = athensHHMMFromKickoff(m.kickoff_ms || m.kickoff);
      const saved = isSaved(m.id);
      const scoreTxt = (m.scoreHome !== "" && m.scoreAway !== "") ? `${m.scoreHome}-${m.scoreAway}` : "";
      const sub = `${esc(m.status || "")}${m.minute ? ` • ${esc(m.minute)}` : ""}`;

      return `
        <div class="row match-row" data-mid="${esc(m.id)}" style="padding:10px;">
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <div style="min-width:56px;opacity:.95;font-variant-numeric:tabular-nums;">${esc(timeTxt)}</div>

            <div style="flex:1;min-width:0;">
              <div style="display:flex;gap:8px;align-items:flex-start;">
                <div style="flex:1;min-width:0;line-height:1.25em;">
                  ${esc(tnDisplay(m.home))} <span style="opacity:.7;">-</span> ${esc(tnDisplay(m.away))}
                </div>
                ${scoreTxt ? `<div style="white-space:nowrap;opacity:.95;">${esc(scoreTxt)}</div>` : ``}
              </div>
              ${sub.trim() ? `<div style="opacity:.7;font-size:11px;margin-top:4px;">${sub}</div>` : ``}
            </div>

            <div style="display:flex;gap:8px;align-items:center;">
              <button class="today-icon-btn save ${saved ? "active" : ""}" data-act="save" title="Save">
                ${saved ? "★" : "☆"}
              </button>
              <button class="today-icon-btn" data-act="details" title="Details">i</button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // ---------- data load ----------
  async function loadFixturesForDate(dateKey) {
    const b = baseUrl();
    if (!b) return [];
    const url = `${b}/fixtures?date=${encodeURIComponent(dateKey)}`;
    const p = await safeJson(url);
    const arr = extractArray(p);
    return arr.map(normalizeMatch);
  }

  async function loadForLeague(league) {
    state.league = league;
    state.matches = [];
    render();

    // Prefer Today cache (fast) if same day loaded
    const todayKey = state.lastToday.dateKey || ymdInAthens(new Date());
    let pool = Array.isArray(state.lastToday.items) ? state.lastToday.items.slice() : [];

    if (!pool.length) {
      const fetched = await loadFixturesForDate(todayKey);
      pool = fetched;
    } else {
      // Ensure normalization/enrichment for cached items too
      pool = pool.map(normalizeMatch);
    }

    const filtered = pool.filter((m) => matchLeagueEquals(m, league));
    state.matches = filtered;
    render();
  }

  // ---------- events ----------
  on("league-selected", (lg) => {
    if (!lg || !lg.id) return;
    // open Matches panel on click (as before)
    if (typeof window.openAccordion === "function") window.openAccordion("panel-matches");
    loadForLeague(lg);
  });

  // Keep a cache of today's matches so Matches panel can filter without extra fetch
  on("today-matches:loaded", (p) => {
    const items = Array.isArray(p?.items) ? p.items : (Array.isArray(p?.matches) ? p.matches : []);
    const dateKey = String(p?.dateKey || "");
    state.lastToday = { dateKey, items: items };
  });

  on("saved-store:updated", () => render());

  // Clicks: save/details/row select
  listEl.addEventListener("click", (ev) => {
    const row = ev.target && ev.target.closest ? ev.target.closest("[data-mid]") : null;
    if (!row) return;

    const id = row.getAttribute("data-mid") || "";
    const m = (state.matches || []).find((x) => String(x.id) === String(id));
    if (!m) return;

    const btn = ev.target && ev.target.closest ? ev.target.closest("[data-act]") : null;
    const act = btn ? btn.getAttribute("data-act") : "";

    if (act === "save") {
      toggleSave(m);
      render();
      return;
    }
    if (act === "details") {
      emit("details-open", m);
      return;
    }

    // row click -> match-selected
    emit("match-selected", m);
  });

  // Boot: remain empty until league-selected
  ensureToolbar();
  render();

})();
