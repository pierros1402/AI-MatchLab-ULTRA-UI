/* ============================================================
   assets/js/ui/today-panel.js  (CLEAN v1.9.0)
   - Loads fixtures from Worker (/fixtures)
   - View modes:
       • Time  (sorted by kickoff time)
       • League (grouped in league cards, matches sorted by kickoff)
   - Actions:
       • Row click -> emit("match-selected", match)
       • ★ -> SavedStore.toggle(match)
       • i -> DetailsModal.open(match) or emit("details-open", match)
   - Emits:
       today-matches:loaded { dateKey, scope, matches, meta }
============================================================ */
(function () {
  "use strict";

  const cfg = window.AIML_LIVE_CFG || {};
  const fixturesBase = (cfg.fixturesBase || cfg.liveUltraBase || "").replace(/\/+$/, "");
  const fixturesPath = String(cfg.fixturesPath || "/fixtures");
  const scope = String(cfg.fixturesScope || "all");

  const panel = document.getElementById("panel-today");
  const listEl = document.getElementById("today-list");
  if (!panel || !listEl || !fixturesBase) return;

  const PREF_KEY = "AIML_TODAY_PREFS_V1";
  const CACHE_KEY_PREFIX = "AIML_TODAY_CACHE_V1:";

  const state = {
    dateKey: ymdAthens(new Date()), // YYYY-MM-DD (Athens)
    view: "time", // time | league
    savedOnly: false,
    matches: [],
    meta: {}
  };

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function ymdAthens(dt) {
    // Stable "YYYY-MM-DD" in Europe/Athens.
    try {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit" })
        .formatToParts(dt)
        .reduce((a, p) => (a[p.type] = p.value, a), {});
      return `${parts.year}-${parts.month}-${parts.day}`;
    } catch (_) {
      // Fallback to local
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  function addDaysYmd(ymd, add) {
    const dt = new Date(`${ymd}T00:00:00`);
    dt.setDate(dt.getDate() + Number(add || 0));
    return ymdAthens(dt);
  }

  function athensTime(ms) {
    if (!ms || !Number.isFinite(ms)) return "--:--";
    try {
      return new Intl.DateTimeFormat("el-GR", { timeZone: "Europe/Athens", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
    } catch (_) {
      const d = new Date(ms);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
  }

  function parseKickoffMs(m) {
    const raw =
      (typeof m?.kickoff_ms === "number" ? m.kickoff_ms : null) ||
      m?.kickoff ||
      m?.date ||
      m?.utcDate ||
      m?.utc_date ||
      m?.startTime ||
      m?.start_time ||
      m?.ts ||
      m?.timestamp ||
      null;

    if (!raw) return 0;
    if (typeof raw === "number") return raw > 1e12 ? raw : raw * 1000;
    const t = Date.parse(String(raw));
    return Number.isFinite(t) ? t : 0;
  }

  function isFinished(m) {
    const s = String(m?.status || "").toUpperCase();
    const st = String(m?.state || "").toLowerCase();
    return (
      st === "post" ||
      s.includes("FINAL") ||
      s.includes("FULL") ||
      s.includes("FT") ||
      s.includes("POST") ||
      s.includes("CANCEL") ||
      s.includes("ABANDON") ||
      s.includes("SUSP") ||
      s.includes("AWARDED")
    );
  }

  function isLive(m) {
    const s = String(m?.status || "").toUpperCase();
    const st = String(m?.state || "").toLowerCase();
    return st === "in" || st === "live" || s.includes("LIVE") || s.includes("IN PROGRESS");
  }

  function liveClock(m) {
    const min = Number(m?.minute || 0);
    if (min > 0) return `${min}'`;
    const c = String(m?.clock || "").trim();
    if (c) return c;
    const d = String(m?.status_detail || "").trim();
    const mm = d.match(/(\d{1,3})/);
    return mm && mm[1] ? `${mm[1]}'` : "LIVE";
  }

  function norm(m) {
    const kickoff_ms = parseKickoffMs(m);
    return {
      id: String(m?.id || m?.eventId || m?.event_id || m?.matchId || `M_${kickoff_ms}_${Math.random().toString(16).slice(2)}`),
      title: String(m?.title || `${m?.home || ""} - ${m?.away || ""}` || ""),
      home: m?.home || m?.homeTeam || m?.home_name || "",
      away: m?.away || m?.awayTeam || m?.away_name || "",
      leagueName: String(m?.leagueName || m?.league || m?.competition || "Unknown League"),
      leagueSlug: String(m?.leagueSlug || m?.league_slug || m?.leagueId || ""),
      leagueId: m?.leagueId || null,
      kickoff: m?.kickoff || m?.date || null,
      kickoff_ms,
      status: m?.status || "",
      state: m?.state || "",
      status_detail: m?.status_detail || m?.detail || "",
      clock: m?.clock || "",
      minute: Number(m?.minute || 0),
      period: m?.period ?? null,
      score_text: String(m?.score_text || m?.score || ""),
      score: String(m?.score || ""),
      raw: m
    };
  }

  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
      if (p && typeof p === "object") {
        if (p.dateKey) state.dateKey = String(p.dateKey);
        if (p.view === "time" || p.view === "league") state.view = p.view;
        state.savedOnly = !!p.savedOnly;
      }
    } catch (_) {}
  }

  function savePrefs() {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({ dateKey: state.dateKey, view: state.view, savedOnly: state.savedOnly }));
    } catch (_) {}
  }

  function cacheGet(dateKey) {
    try {
      const obj = JSON.parse(localStorage.getItem(CACHE_KEY_PREFIX + dateKey) || "null");
      if (!obj || !obj.ts || !Array.isArray(obj.matches)) return null;
      if (Date.now() - Number(obj.ts) > 30 * 1000) return null; // 30s TTL
      return obj;
    } catch (_) { return null; }
  }

  function cacheSet(dateKey, matches, meta) {
    try {
      localStorage.setItem(CACHE_KEY_PREFIX + dateKey, JSON.stringify({ ts: Date.now(), matches, meta: meta || {} }));
    } catch (_) {}
  }

  function ensureControls() {
    if (panel.querySelector(".today-controls")) return;

    const wrap = document.createElement("div");
    wrap.className = "today-controls";
    wrap.style.display = "flex";
    wrap.style.gap = "8px";
    wrap.style.alignItems = "center";
    wrap.style.padding = "8px 8px 6px 8px";
    wrap.style.borderBottom = "1px solid rgba(255,255,255,0.08)";

    // Date selector (Today + next 6)
    const sel = document.createElement("select");
    sel.className = "today-date";
    sel.style.flex = "1 1 auto";
    sel.style.minWidth = "120px";

    for (let i = 0; i < 7; i++) {
      const dk = addDaysYmd(ymdAthens(new Date()), i);
      const opt = document.createElement("option");
      opt.value = dk;
      opt.textContent = i === 0 ? "Today" : dk;
      sel.appendChild(opt);
    }

    // View toggle
    const btnTime = document.createElement("button");
    btnTime.className = "btn-slim";
    btnTime.type = "button";
    btnTime.dataset.view = "time";
    btnTime.textContent = "Time";

    const btnLeague = document.createElement("button");
    btnLeague.className = "btn-slim";
    btnLeague.type = "button";
    btnLeague.dataset.view = "league";
    btnLeague.textContent = "League";

    // Saved-only
    const chkLbl = document.createElement("label");
    chkLbl.style.display = "inline-flex";
    chkLbl.style.alignItems = "center";
    chkLbl.style.gap = "6px";
    chkLbl.style.whiteSpace = "nowrap";
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.className = "today-saved-only";
    chkLbl.appendChild(chk);
    chkLbl.appendChild(document.createTextNode("Saved only"));

    wrap.appendChild(sel);
    wrap.appendChild(btnTime);
    wrap.appendChild(btnLeague);
    wrap.appendChild(chkLbl);

    panel.insertBefore(wrap, panel.firstChild);

    sel.addEventListener("change", () => {
      state.dateKey = String(sel.value || state.dateKey);
      savePrefs();
      load();
    });

    wrap.addEventListener("click", (e) => {
      const v = e.target && e.target.dataset ? e.target.dataset.view : "";
      if (v === "time" || v === "league") {
        state.view = v;
        savePrefs();
        render();
      }
    });

    chk.addEventListener("change", () => {
      state.savedOnly = !!chk.checked;
      savePrefs();
      render();
    });
  }

  function getSavedSet() {
    try {
      const ids = window.SavedStore?.ids ? window.SavedStore.ids() : null;
      if (Array.isArray(ids)) return new Set(ids.map(String));
    } catch (_) {}
    return new Set();
  }

  function applyFilters(arr) {
    let out = Array.isArray(arr) ? arr.slice() : [];
    // In Today view we do not keep finished by default (worker already filters, but we enforce)
    out = out.filter((m) => !isFinished(m));
    if (state.savedOnly) {
      const saved = getSavedSet();
      out = out.filter((m) => saved.has(String(m.id)));
    }
    return out;
  }

  function render() {
    const controls = panel.querySelector(".today-controls");
    const sel = controls ? controls.querySelector(".today-date") : null;
    const chk = controls ? controls.querySelector(".today-saved-only") : null;
    if (sel) sel.value = state.dateKey;
    if (chk) chk.checked = !!state.savedOnly;

    const items = applyFilters(state.matches);

    if (!items.length) {
      listEl.innerHTML = `<div class="empty">No matches.</div>`;
      return;
    }

    if (state.view === "time") {
      items.sort((a, b) => (a.kickoff_ms || 0) - (b.kickoff_ms || 0));
      listEl.innerHTML = items.map((m) => {
        const mid = esc(m.id);
        const t = athensTime(m.kickoff_ms);
        const subParts = [];
        const lg = esc(m.leagueName || "");
        if (lg) subParts.push(lg);
        const sc = esc(m.score_text || "");
        if (sc) subParts.push(sc);
        if (isLive(m)) subParts.push(esc(liveClock(m)));
        const sub = subParts.join(" • ");
        return `
          <div class="today-row" data-mid="${mid}">
            <div class="today-time">${t}</div>
            <div class="today-main">
              <div class="today-title">${esc(m.title || "")}</div>
              <div class="today-sub">${sub}</div>
            </div>
            <div class="today-actions">
              <button class="btn-slim" data-act="save" data-mid="${mid}" title="Save">★</button>
              <button class="btn-slim" data-act="info" data-mid="${mid}" title="Details">i</button>
            </div>
          </div>
        `.trim();
      }).join("");
      return;
    }

    // League view
    const byLeague = Object.create(null);
    items.forEach((m) => {
      const key = String(m.leagueSlug || m.leagueName || "Unknown").toLowerCase();
      (byLeague[key] = byLeague[key] || []).push(m);
    });

    const leagues = Object.keys(byLeague).sort((a, b) => a.localeCompare(b));
    listEl.innerHTML = leagues.map((k) => {
      const arr = byLeague[k].slice().sort((a, b) => (a.kickoff_ms || 0) - (b.kickoff_ms || 0));
      const label = esc(arr[0].leagueName || "Unknown League");
      const body = arr.map((m) => {
        const mid = esc(m.id);
        const t = athensTime(m.kickoff_ms);
        const sc = esc(m.score_text || "");
        const sub = [sc, isLive(m) ? esc(liveClock(m)) : ""].filter(Boolean).join(" • ");
        return `
          <div class="today-row" data-mid="${mid}">
            <div class="today-time">${t}</div>
            <div class="today-main">
              <div class="today-title">${esc(m.title || "")}</div>
              <div class="today-sub">${sub}</div>
            </div>
            <div class="today-actions">
              <button class="btn-slim" data-act="save" data-mid="${mid}" title="Save">★</button>
              <button class="btn-slim" data-act="info" data-mid="${mid}" title="Details">i</button>
            </div>
          </div>
        `.trim();
      }).join("");

      return `
        <div class="today-league-card">
          <div class="today-league-hdr">${label} <span class="today-league-count">(${arr.length})</span></div>
          <div class="today-league-body">${body}</div>
        </div>
      `.trim();
    }).join("");
  }

  function openDetails(match) {
    if (window.DetailsModal && typeof window.DetailsModal.open === "function") {
      window.DetailsModal.open(match);
      return;
    }
    if (typeof window.emit === "function") window.emit("details-open", match);
  }

  function onListClick(e) {
    const btn = e.target && e.target.closest ? e.target.closest("button[data-act]") : null;
    if (btn) {
      const act = btn.getAttribute("data-act");
      const mid = btn.getAttribute("data-mid");
      const m = state.matches.find((x) => String(x.id) === String(mid));
      if (!m) return;

      if (act === "save") {
        window.SavedStore?.toggle?.(m);
        render();
        return;
      }
      if (act === "info") {
        openDetails(m);
        return;
      }
      return;
    }

    const row = e.target && e.target.closest ? e.target.closest(".today-row") : null;
    if (!row) return;
    const mid = row.getAttribute("data-mid");
    const m = state.matches.find((x) => String(x.id) === String(mid));
    if (!m) return;
    if (typeof window.emit === "function") window.emit("match-selected", m);
  }

  async function load() {
    ensureControls();

    // cache
    const cached = cacheGet(state.dateKey);
    if (cached) {
      state.matches = cached.matches;
      state.meta = cached.meta || {};
      render();
      if (typeof window.emit === "function") window.emit("today-matches:loaded", { dateKey: state.dateKey, scope, matches: state.matches, meta: state.meta });
      return;
    }

    listEl.innerHTML = `<div class="empty">Loading…</div>`;

    const yyyymmdd = String(state.dateKey).replace(/-/g, "");
    const url = `${fixturesBase}${fixturesPath}?scope=${encodeURIComponent(scope)}&date=${encodeURIComponent(yyyymmdd)}&days=1&includeFinished=0`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => null);

      const raw = Array.isArray(data?.matches) ? data.matches : [];
      const normed = raw.map(norm).filter((x) => x && x.id);

      state.matches = normed;
      state.meta = data?.meta || {};
      cacheSet(state.dateKey, state.matches, state.meta);

      if (typeof window.emit === "function") window.emit("today-matches:loaded", { dateKey: state.dateKey, scope, matches: state.matches, meta: state.meta });
      render();
    } catch (err) {
      listEl.innerHTML = `<div class="empty">Failed to load fixtures.</div>`;
      state.matches = [];
      state.meta = {};
    }
  }

  // init
  loadPrefs();
  ensureControls();

  // apply prefs to controls
  const controls = panel.querySelector(".today-controls");
  if (controls) {
    const sel = controls.querySelector(".today-date");
    const chk = controls.querySelector(".today-saved-only");
    if (sel) sel.value = state.dateKey;
    if (chk) chk.checked = !!state.savedOnly;
  }

  listEl.addEventListener("click", onListClick);

  // Saved changes re-render
  if (typeof window.on === "function") {
    window.on("saved-store:updated", () => render());
  }

  // Initial load
  load();
})();
