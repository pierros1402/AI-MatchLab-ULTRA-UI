/* ============================================================
   Today Panel v3.2 (Full Controls + Robust Fetch)
   - Removes legacy inline day dropdown (#today-day-select) if present
   - Day dropdown (Today + next 6)
   - Scope toggle: All / Top (defaults from AIML_LIVE_CFG.fixturesScope)
   - View toggle: League / Time
   - Refresh + Saved-only (best-effort integration with SavedStore)
   - Emits: today-matches:loaded { matches }
   - Row click emits: match-selected (and does not auto-open Saved)
   - Info button emits: details-open
   ============================================================ */
(function () {
  "use strict";

  const panel = document.getElementById("panel-today");
  const listEl = document.getElementById("today-list");
  if (!panel || !listEl) return;

  // Remove legacy dropdown if it exists in index.html
  const legacySel = document.getElementById("today-day-select");
  if (legacySel && legacySel.parentElement) {
    try { legacySel.parentElement.remove(); } catch (_) {}
  }

  // Avoid duplicating controls on hot reload
  const existing = panel.querySelector(".today-controls");
  if (existing) { try { existing.remove(); } catch (_) {} }

  const cfg = window.AIML_LIVE_CFG || {};
  const base = String(cfg.fixturesBase || cfg.liveUltraBase || "").replace(/\/+$/, "");
  const path = String(cfg.fixturesPath || "/fixtures");
  const fixturesPath = path.startsWith("/") ? path : ("/" + path);

  let currentScope = String(cfg.fixturesScope || "all").trim().toLowerCase() === "top" ? "top" : "all";
  let currentView = "league";
  let savedOnly = false;

  const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const on = (n, fn) => { try { window.on && window.on(n, fn); } catch (_) {} };
  const emit = (n, p) => { try { window.emit && window.emit(n, p); } catch (_) {} };

  function toYMD(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${dd}`;
  }

  function athensTime(ms) {
    const t = Number(ms || 0);
    if (!t) return "--:--";
    const d = new Date(t);
    return d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Athens", hour12: false });
  }

  function isFinished(status) {
    const s = String(status || "").toUpperCase();
    return (s.includes("FINAL") || s.includes("FULL") || s.includes("POST") || s.includes("CANCEL") || s.includes("COMPLETE") || s.includes("FINISH") || s.includes("GAME_OVER") || s.includes("ENDED"));
  }

  // SavedStore integration (best-effort)
  function getSavedIdSet() {
    const set = new Set();
    try {
      const ss = window.SavedStore;
      if (ss) {
        if (typeof ss.getIds === "function") {
          const ids = ss.getIds();
          if (Array.isArray(ids)) ids.forEach((x) => set.add(String(x)));
          return set;
        }
        if (typeof ss.all === "function") {
          const arr = ss.all();
          if (Array.isArray(arr)) arr.forEach((x) => set.add(String(x?.id || x)));
          return set;
        }
      }
    } catch (_) {}

    // Fallback localStorage common keys
    const keys = ["AIML_SAVED_V1", "AIML_SAVED", "AIMATCHLAB_SAVED_V1"];
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const j = JSON.parse(raw);
        if (Array.isArray(j)) j.forEach((x) => set.add(String(x?.id || x)));
        else if (j && typeof j === "object") Object.keys(j).forEach((id) => set.add(String(id)));
      } catch (_) {}
    }
    return set;
  }

  function toggleSave(match) {
    try {
      const ss = window.SavedStore;
      if (ss) {
        if (typeof ss.toggle === "function") return ss.toggle(match);
        if (typeof ss.toggleById === "function") return ss.toggleById(match.id, match);
        if (typeof ss.add === "function" && typeof ss.remove === "function") {
          const ids = getSavedIdSet();
          return ids.has(String(match.id)) ? ss.remove(match.id) : ss.add(match);
        }
      }
    } catch (_) {}
    // Fallback: do nothing (Saved panel may still work from other panels)
    return false;
  }

  // Build controls
  const ctrls = document.createElement("div");
  ctrls.className = "today-controls";
  ctrls.innerHTML = `
    <div class="ctrl-row" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:4px 8px;">
      <select id="today-date"></select>
      <button id="btn-scope" class="btn-slim">${currentScope === "all" ? "All" : "Top"}</button>
      <button id="btn-view" class="btn-slim">View: ${currentView === "league" ? "League" : "Time"}</button>
      <button id="btn-refresh" class="btn-slim">Refresh</button>
      <button id="btn-saved" class="btn-slim">Saved only</button>
    </div>
  `;
  panel.insertBefore(ctrls, listEl);

  const selDate = ctrls.querySelector("#today-date");
  const btnScope = ctrls.querySelector("#btn-scope");
  const btnView = ctrls.querySelector("#btn-view");
  const btnRefresh = ctrls.querySelector("#btn-refresh");
  const btnSaved = ctrls.querySelector("#btn-saved");

  function buildDates() {
    selDate.innerHTML = "";
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getTime() + i * 86400000);
      const lbl = i === 0
        ? `Today (${d.toLocaleDateString("el-GR")})`
        : d.toLocaleDateString("el-GR", { weekday: "short", day: "2-digit", month: "2-digit" });
      const opt = document.createElement("option");
      opt.value = toYMD(d);
      opt.textContent = lbl;
      selDate.appendChild(opt);
    }
  }
  buildDates();

  let lastPayload = [];

  function render(matches) {
    const savedIds = savedOnly ? getSavedIdSet() : null;
    let arr = Array.isArray(matches) ? matches.slice() : [];
    arr = arr.filter((m) => !isFinished(m.status));
    if (savedIds) arr = arr.filter((m) => savedIds.has(String(m.id)));

    if (!arr.length) {
      listEl.innerHTML = `<div class="muted" style="padding:10px;">No matches found.</div>`;
      return;
    }

    // TIME view
    if (currentView === "time") {
      arr.sort((a, b) => (a.kickoff_ms || 0) - (b.kickoff_ms || 0));
      listEl.innerHTML = arr.map((m) => {
        const mid = esc(m.id);
        const t = athensTime(m.kickoff_ms);
        const score = esc(m.score || "");
        const title = `${esc(m.home)} - ${esc(m.away)}`;
        return `
          <div class="today-row" data-mid="${mid}" style="padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer;">
            <div style="font-weight:700;">${t}</div>
            <div style="opacity:.95;">${title}</div>
            <div style="opacity:.8;">${score}</div>
            <div style="margin-top:6px;display:flex;gap:8px;">
              <button class="btn-slim" data-act="save" data-mid="${mid}">★</button>
              <button class="btn-slim" data-act="info" data-mid="${mid}">i</button>
            </div>
          </div>`;
      }).join("");
      return;
    }

    // LEAGUE view
    const map = Object.create(null);
    for (const m of arr) {
      const k = String(m.leagueName || m.leagueSlug || "Unknown");
      (map[k] ||= []).push(m);
    }

    const leagues = Object.keys(map).sort((a, b) => a.localeCompare(b));
    listEl.innerHTML = leagues.map((k) => {
      const items = map[k].slice().sort((a, b) => (a.kickoff_ms || 0) - (b.kickoff_ms || 0));
      return `
        <div class="today-league-card" style="margin:8px;padding:8px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
          <div class="today-league-head" data-act="league" data-league="${esc(k)}" style="font-weight:700;cursor:pointer;">${esc(k)} • ${items.length}</div>
          <div class="today-league-body">
            ${items.map((m) => {
              const mid = esc(m.id);
              const t = athensTime(m.kickoff_ms);
              const score = esc(m.score || "");
              const title = `${esc(m.home)} - ${esc(m.away)}`;
              return `
                <div class="today-row" data-mid="${mid}" style="padding:8px 10px;border-top:1px solid rgba(255,255,255,0.06);cursor:pointer;">
                  <div style="font-weight:700;">${t}</div>
                  <div style="opacity:.95;">${title}</div>
                  <div style="opacity:.8;">${score}</div>
                  <div style="margin-top:6px;display:flex;gap:8px;">
                    <button class="btn-slim" data-act="save" data-mid="${mid}">★</button>
                    <button class="btn-slim" data-act="info" data-mid="${mid}">i</button>
                  </div>
                </div>`;
            }).join("")}
          </div>
        </div>`;
    }).join("");
  }

  async function fetchFixtures() {
    // If base missing, fail fast (prevents hanging on "/" HTML -> json parse)
    if (!base) {
      listEl.innerHTML = `<div class="muted" style="padding:10px;">Today feed misconfigured (missing liveUltraBase/fixturesBase).</div>`;
      return;
    }

    listEl.innerHTML = `<div class="muted" style="padding:10px;">Loading...</div>`;

    const ymd = selDate.value || toYMD(new Date());
    const url = `${base}${fixturesPath}?scope=${encodeURIComponent(currentScope)}&date=${encodeURIComponent(ymd)}&v=${Date.now()}`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => { try { ctrl.abort(); } catch (_) {} }, 12000);

    try {
      const r = await fetch(url, { cache: "no-store", signal: ctrl.signal });
      const ct = String(r.headers.get("content-type") || "");
      if (!r.ok) throw new Error(`http_${r.status}`);
      if (!ct.includes("application/json")) throw new Error("non_json");

      const j = await r.json();
      const arr = Array.isArray(j?.matches) ? j.matches : [];
      lastPayload = arr;

      render(arr);
      emit("today-matches:loaded", { matches: arr });
    } catch (e) {
      const msg = (e && e.name === "AbortError") ? "Timeout loading fixtures." : "Error loading fixtures.";
      listEl.innerHTML = `<div class="muted" style="padding:10px;">${esc(msg)}</div>`;
    } finally {
      clearTimeout(timer);
    }
  }

  // Controls
  ctrls.addEventListener("click", (e) => {
    const t = e.target;
    if (t === btnScope) {
      currentScope = currentScope === "all" ? "top" : "all";
      btnScope.textContent = currentScope === "all" ? "All" : "Top";
      fetchFixtures();
      return;
    }
    if (t === btnView) {
      currentView = currentView === "league" ? "time" : "league";
      btnView.textContent = `View: ${currentView === "league" ? "League" : "Time"}`;
      render(lastPayload);
      return;
    }
    if (t === btnRefresh) {
      fetchFixtures();
      return;
    }
    if (t === btnSaved) {
      savedOnly = !savedOnly;
      btnSaved.textContent = savedOnly ? "Saved: ON" : "Saved only";
      render(lastPayload);
      return;
    }
  });

  // List interactions
  listEl.addEventListener("click", (e) => {
    const act = e.target && e.target.getAttribute ? e.target.getAttribute("data-act") : "";
    const mid = e.target && e.target.getAttribute ? e.target.getAttribute("data-mid") : "";

    if (act === "save" && mid) {
      e.preventDefault();
      e.stopPropagation();
      const m = (lastPayload || []).find((x) => String(x.id) === String(mid));
      if (m) toggleSave(m);
      // Re-render to reflect saved-only filtering
      render(lastPayload);
      return;
    }

    if (act === "info" && mid) {
      e.preventDefault();
      e.stopPropagation();
      const m = (lastPayload || []).find((x) => String(x.id) === String(mid));
      if (m) emit("details-open", { match: m, source: "today" });
      return;
    }

    // Match row click
    const row = e.target && e.target.closest ? e.target.closest(".today-row") : null;
    if (row) {
      const id = row.getAttribute("data-mid");
      const m = (lastPayload || []).find((x) => String(x.id) === String(id));
      if (m) emit("match-selected", m);
      return;
    }

    // League header click
    const lh = e.target && e.target.closest ? e.target.closest(".today-league-head") : null;
    if (lh) {
      const leagueName = lh.getAttribute("data-league") || "";
      // Best effort: emit league-selected with a predictable payload
      emit("league-selected", { name: leagueName, source: "today" });
    }
  });

  selDate.addEventListener("change", fetchFixtures);

  // Re-render on saved updates
  on("saved-store:updated", () => { if (savedOnly) render(lastPayload); });

  fetchFixtures();
})();
