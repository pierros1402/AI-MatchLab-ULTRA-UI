/* ============================================================
   assets/js/ui/today-panel.js  (FULL LINKED v1.8.5)
   - Loads fixtures from Worker (/fixtures) — no demo dependency
   - View modes:
       • Time  (sorted by kickoff time)
       • League (grouped in clean league cards, sorted by kickoff time)
   - Actions:
       • Row click -> emit("match-selected", match)
       • ★ -> SavedStore.toggle(match)
       • i -> DetailsModal.open(match) or emit("details-open", match)
       • League header click (League view) -> emit("league-selected", {id,name,...}) and open Matches panel
   - Emits:
       today-matches:loaded { dateKey, scope, matches, meta }
============================================================ */
(function () {
  "use strict";

  // Allow upgrades without hard-refresh (versioned guard)
  const VER = "1.8.5";
  if (window.__AIML_TODAY_PANEL_VER__ === VER) return;
  window.__AIML_TODAY_PANEL_VER__ = VER;

  const panel = document.getElementById("panel-today");
  const listEl = document.getElementById("today-list");
  if (!panel || !listEl) return;

  const cfg = () => window.AIML_LIVE_CFG || {};
  const base = () => String(cfg().fixturesBase || cfg().liveUltraBase || "").replace(/\/+$/, "");
  const fixturesPath = () => String(cfg().fixturesPath || "/fixtures");
  const defaultScope = () => String(cfg().fixturesScope || "all"); // "all" | "top"

  const on = (n, f) => (window.on ? window.on(n, f) : null);
  const emit = (n, p) => (window.emit ? window.emit(n, p) : null);

  const esc = (s) =>
    String(s == null ? "" : s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  function toYMD(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }

  function parseKickoffMs(m) {
    // accept many shapes
    const raw =
      m?.kickoff ||
      m?.utcDate ||
      m?.startDate ||
      m?.startTime ||
      m?.eventDate ||
      m?.date ||
      m?.competitionDate ||
      m?.competitions?.[0]?.date ||
      null;

    if (!raw) return 0;

    // numeric epoch?
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") {
      // YYYY-MM-DDTHH:mm:ssZ / ISO
      const t = Date.parse(raw);
      if (!Number.isNaN(t)) return t;

      // "20251223T200000Z" etc.
      const m1 = raw.match(/^(\d{4})(\d{2})(\d{2})[T\s]?(\d{2})(\d{2})/);
      if (m1) {
        const [_, yy, mm, dd, hh, mi] = m1;
        const iso = `${yy}-${mm}-${dd}T${hh}:${mi}:00Z`;
        const t2 = Date.parse(iso);
        if (!Number.isNaN(t2)) return t2;
      }
    }
    return 0;
  }

  function athensTime(ms) {
    const t = Number(ms || 0);
    if (!t) return "--:--";
    try {
      return new Date(t).toLocaleTimeString("el-GR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Athens",
        hour12: false
      });
    } catch (_) {
      return "--:--";
    }
  }

  function isFinished(status) {
    const s = String(status || "").toUpperCase();
    return s === "FINISHED" || s === "FT" || s === "FINAL" || s === "AET" || s === "PEN" || s === "ENDED";
  }

  // --- State
  let currentScope = defaultScope();
  let currentView = "time"; // "time" | "league"
  let savedOnly = false;
  let lastDateKey = toYMD(new Date());
  let lastPayload = [];
  let lastMeta = null;

  // --- Controls / UI
  function inner() {
    return document.getElementById("today-list-inner");
  }

  function selDate() {
    return document.getElementById("today-date");
  }

  function btn(id) {
    return document.getElementById(id);
  }

  function getSavedIdSet() {
    const st = window.SavedStore;
    if (!st) return new Set();
    try {
      if (typeof st.getIds === "function") return new Set((st.getIds() || []).map(String));
      if (Array.isArray(st.ids)) return new Set(st.ids.map(String));
    } catch (_) {}
    return new Set();
  }

  function ensureScaffold() {
    // Rebuild scaffold if someone overwrote #today-list (common during UI changes)
    if (document.getElementById("today-list-inner")) return;

    listEl.innerHTML = `
      <div class="today-toolbar" style="padding:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <select id="today-date" class="btn-slim"></select>
        <button id="btn-scope" class="btn-slim">${currentScope === "all" ? "All" : "Top"}</button>
        <button id="btn-view" class="btn-slim">View: ${currentView === "league" ? "League" : "Time"}</button>
        <button id="btn-refresh" class="btn-slim">Refresh</button>
        <button id="btn-saved" class="btn-slim">Saved only</button>
      </div>
      <div id="today-list-inner"></div>
    `;

    // Populate day selector: today + next 6
    const sel = selDate();
    if (sel) {
      sel.innerHTML = "";
      const now = new Date();
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        const ymd = toYMD(d);
        const label =
          i === 0
            ? `Today (${d.toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" })})`
            : d.toLocaleDateString("el-GR", { weekday: "short", day: "2-digit", month: "2-digit" });
        days.push({ ymd, label });
      }
      days.forEach((d) => {
        const opt = document.createElement("option");
        opt.value = d.ymd;
        opt.textContent = d.label;
        sel.appendChild(opt);
      });
      sel.value = lastDateKey;
    }
  }

  function normalizeMatch(m) {
    const kickoff_ms = parseKickoffMs(m);
    const home = m?.home ?? m?.homeName ?? m?.home_team ?? m?.teams?.home ?? "";
    const away = m?.away ?? m?.awayName ?? m?.away_team ?? m?.teams?.away ?? "";
    const leagueSlug = m?.leagueSlug ?? m?.league ?? m?.league_code ?? m?.leagueKey ?? "";
    const leagueId = m?.leagueId ?? m?.lid ?? m?.league_id ?? "";
    const leagueName = m?.leagueName ?? m?.league_name ?? m?.competition ?? m?.leagueTitle ?? "";
    const id = m?.id ?? m?.eventId ?? m?.event ?? "";
    const status = m?.status ?? m?.state ?? m?.matchStatus ?? "";
    const score = m?.score_text ?? m?.score ?? "";
    return {
      ...m,
      id,
      home,
      away,
      leagueSlug,
      leagueId,
      leagueName,
      status,
      score,
      kickoff_ms
    };
  }

  function render(matches) {
    ensureScaffold();
    const innerEl = inner();
    if (!innerEl) return;

    const savedIds = savedOnly ? getSavedIdSet() : null;
    let arr = Array.isArray(matches) ? matches.slice() : [];

    // Normalize once for render stability
    arr = arr.map(normalizeMatch);

    // Do not show FINISHED in Today view
    arr = arr.filter((m) => !isFinished(m.status));
    if (savedIds) arr = arr.filter((m) => savedIds.has(String(m.id)));

    if (!arr.length) {
      innerEl.innerHTML = `<div class="muted" style="padding:10px;">No matches found.</div>`;
      return;
    }

    // TIME view
    if (currentView === "time") {
      arr.sort((a, b) => (a.kickoff_ms || 0) - (b.kickoff_ms || 0));
      innerEl.innerHTML = arr
        .map((m) => {
          const mid = esc(m.id);
          const t = athensTime(m.kickoff_ms);
          const score = esc(m.score || "");
          const title = `${esc(m.home)} - ${esc(m.away)}`;
          const league = esc(m.leagueName || m.leagueSlug || "");
          return `
            <div class="today-row" data-mid="${mid}" style="padding:10px;border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer;">
              <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
                <div style="font-weight:800;">${t}</div>
                <div style="opacity:.75;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70%">${league}</div>
              </div>
              <div style="opacity:.96;margin-top:2px;">${title}</div>
              ${score ? `<div style="opacity:.85;margin-top:2px;">${score}</div>` : ``}
              <div style="margin-top:8px;display:flex;gap:8px;">
                <button class="btn-slim" data-act="save" data-mid="${mid}" title="Save">★</button>
                <button class="btn-slim" data-act="info" data-mid="${mid}" title="Details">i</button>
              </div>
            </div>`;
        })
        .join("");
      return;
    }

    // LEAGUE view
    const map = Object.create(null);
    for (const m of arr) {
      const leagueId = String(m.leagueId || "").trim();
      const leagueName = String(m.leagueName || "").trim();
      const leagueSlug = String(m.leagueSlug || "").trim();
      const key = leagueId || leagueSlug || leagueName || "Unknown";
      if (!map[key]) map[key] = { key, leagueId, leagueName, leagueSlug, items: [] };
      map[key].items.push(m);
    }

    const leagues = Object.values(map).sort((a, b) => {
      const an = String(a.leagueName || a.key);
      const bn = String(b.leagueName || b.key);
      return an.localeCompare(bn);
    });

    innerEl.innerHTML = leagues
      .map((L) => {
        const label = esc(L.leagueName || L.leagueSlug || L.key || "Unknown");
        const lid = esc(L.leagueId || "");
        const lslug = esc(L.leagueSlug || "");
        const items = L.items.slice().sort((a, b) => (a.kickoff_ms || 0) - (b.kickoff_ms || 0));
        return `
          <div class="today-league-card" style="margin:8px;padding:8px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
            <div class="today-league-head" data-act="league" data-league-id="${lid}" data-league-name="${label}" data-league-slug="${lslug}"
                 style="padding:6px 6px 10px 6px;font-weight:900;cursor:pointer;display:flex;justify-content:space-between;gap:10px;align-items:center;">
              <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${label}</div>
              <div style="opacity:.7;font-size:12px;">${items.length}</div>
            </div>
            <div class="today-league-body">
              ${items
                .map((m) => {
                  const mid = esc(m.id);
                  const t = athensTime(m.kickoff_ms);
                  const score = esc(m.score || "");
                  const title = `${esc(m.home)} - ${esc(m.away)}`;
                  return `
                    <div class="today-row" data-mid="${mid}" style="padding:8px;border-top:1px solid rgba(255,255,255,0.06);cursor:pointer;">
                      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
                        <div style="font-weight:800;">${t}</div>
                        ${score ? `<div style="opacity:.85;">${score}</div>` : `<div></div>`}
                      </div>
                      <div style="opacity:.96;margin-top:2px;">${title}</div>
                      <div style="margin-top:8px;display:flex;gap:8px;">
                        <button class="btn-slim" data-act="save" data-mid="${mid}" title="Save">★</button>
                        <button class="btn-slim" data-act="info" data-mid="${mid}" title="Details">i</button>
                      </div>
                    </div>`;
                })
                .join("")}
            </div>
          </div>`;
      })
      .join("");
  }

  // ----------------------------
  // Data load
  // ----------------------------
  async function fetchFixtures() {
    ensureScaffold();

    const b = base();
    if (!b) {
      const innerEl = inner();
      if (innerEl) innerEl.innerHTML = `<div class="muted" style="padding:10px;">Missing fixturesBase/liveUltraBase.</div>`;
      return;
    }

    const dateKey = (selDate() && selDate().value) ? String(selDate().value) : lastDateKey;
    lastDateKey = dateKey;

    const url = `${b}${fixturesPath()}?date=${encodeURIComponent(dateKey)}&scope=${encodeURIComponent(currentScope)}&v=${Date.now()}`;
    const innerEl = inner();
    if (innerEl) innerEl.innerHTML = `<div class="muted" style="padding:10px;">Loading…</div>`;

    try {
      const res = await fetch(url, { method: "GET", credentials: "omit" });
      const data = await res.json().catch(() => null);

      const matches = Array.isArray(data?.matches) ? data.matches.map(normalizeMatch) : [];
      lastMeta = data?.meta || null;
      lastPayload = matches;

      // Emit full payload (even if UI filters finished)
      emit("today-matches:loaded", {
        dateKey,
        scope: currentScope,
        matches: matches.slice(),
        meta: lastMeta,
        source: "fixtures"
      });

      render(matches);
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err || "unknown error");
      if (innerEl) innerEl.innerHTML = `<div class="muted" style="padding:10px;">Failed to load fixtures: ${esc(msg)}</div>`;
    }
  }

  // ----------------------------
  // Events
  // ----------------------------
  function openDetails(m) {
    if (!m) return;
    if (window.DetailsModal && typeof window.DetailsModal.open === "function") {
      window.DetailsModal.open(m);
      return;
    }
    emit("details-open", m);
  }

  // Unified click handling (fixes "View Time/League same" issue caused by target != button)
  panel.addEventListener("click", (e) => {
    ensureScaffold();
    const t = e.target;
    const b = t && t.closest ? t.closest("button") : null;

    if (b && b.id === "btn-scope") {
      currentScope = currentScope === "all" ? "top" : "all";
      b.textContent = currentScope === "all" ? "All" : "Top";
      fetchFixtures();
      return;
    }

    if (b && b.id === "btn-view") {
      currentView = currentView === "league" ? "time" : "league";
      b.textContent = `View: ${currentView === "league" ? "League" : "Time"}`;
      render(lastPayload);
      return;
    }

    if (b && b.id === "btn-refresh") {
      fetchFixtures();
      return;
    }

    if (b && b.id === "btn-saved") {
      savedOnly = !savedOnly;
      b.textContent = savedOnly ? "Saved only ✓" : "Saved only";
      render(lastPayload);
      return;
    }

    // League header click (League view)
    const leagueHead = t && t.closest ? t.closest('[data-act="league"]') : null;
    if (leagueHead) {
      const leagueId = String(leagueHead.getAttribute("data-league-id") || "");
      const leagueSlug = String(leagueHead.getAttribute("data-league-slug") || "");
      const leagueName = String(leagueHead.getAttribute("data-league-name") || "");

      // Prefer leagueId from worker; else derive from slug/name
      const id =
        leagueId ||
        (leagueSlug ? leagueSlug.toUpperCase().replace(/[^A-Z0-9]/g, "") : "") ||
        leagueName.toUpperCase().replace(/[^A-Z0-9]/g, "");

      const name = leagueName || leagueSlug || "League";

      emit("league-selected", { id, name, leagueSlug, leagueId, source: "today" });
      if (typeof window.openAccordion === "function") window.openAccordion("panel-matches");
      return;
    }

    // Save / Info buttons
    const actBtn = t && t.closest ? t.closest("[data-act]") : null;
    const act = actBtn ? String(actBtn.getAttribute("data-act") || "") : "";
    const mid = actBtn ? String(actBtn.getAttribute("data-mid") || "") : "";

    if (act === "save" && mid) {
      e.preventDefault();
      e.stopPropagation();
      const store = window.SavedStore;
      const m = lastPayload.find((x) => String(x.id) === String(mid));
      if (store && typeof store.toggle === "function" && m) store.toggle(m);
      return;
    }

    if (act === "info" && mid) {
      e.preventDefault();
      e.stopPropagation();
      const m = lastPayload.find((x) => String(x.id) === String(mid));
      if (m) openDetails(m);
      return;
    }

    // Match row click
    const row = t && t.closest ? t.closest(".today-row") : null;
    if (row) {
      const id = row.getAttribute("data-mid");
      const m = lastPayload.find((x) => String(x.id) === String(id));
      if (m) emit("match-selected", m);
      return;
    }
  });

  // Date change
  panel.addEventListener("change", (e) => {
    ensureScaffold();
    const sel = selDate();
    if (e.target === sel) fetchFixtures();
  });

  // Re-render when saved changes
  on("saved-store:updated", () => render(lastPayload));

  // Initial load when app becomes ready
  on("app-ready", () => fetchFixtures());
  // Also load immediately (in case app-ready already fired)
  fetchFixtures();
})();