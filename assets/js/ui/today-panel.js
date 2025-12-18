/* =========================================================
   TODAY PANEL — AI MatchLab ULTRA (STABLE + LOG)
   ---------------------------------------------------------
   - Renders demo "today matches" into #today-list
   - Row click => emit('match-selected', match)
   - ★ => SavedStore.toggle(match)
   - i => emit('details-open', match)
   - Emits 'today-matches:loaded' after successful render
========================================================= */

(function () {
  "use strict";
  if (window.__AIML_TODAY_PANEL_INIT__) return;
  window.__AIML_TODAY_PANEL_INIT__ = true;

  function emitBus(name, payload) {
    if (typeof window.emit === "function") window.emit(name, payload);
    else document.dispatchEvent(new CustomEvent(name, { detail: payload }));
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function hasSavedStore() {
    return !!(window.SavedStore &&
      typeof window.SavedStore.toggle === "function" &&
      typeof window.SavedStore.isSaved === "function");
  }

  function isSaved(id) {
    try { return hasSavedStore() ? !!window.SavedStore.isSaved(id) : false; } catch { return false; }
  }

  function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  }

  function makeDemoTodayMatches() {
    const day = todayKey();
    return [
      { matchId: `T:${day}:1`, home: "Panathinaikos", away: "AEK", kickoff: "19:30", leagueName: "Greece · Super League" },
      { matchId: `T:${day}:2`, home: "Olympiacos", away: "PAOK", kickoff: "21:00", leagueName: "Greece · Super League" },
      { matchId: `T:${day}:3`, home: "Arsenal", away: "Chelsea", kickoff: "22:15", leagueName: "England · Premier League" },
      { matchId: `T:${day}:4`, home: "Barcelona", away: "Sevilla", kickoff: "20:45", leagueName: "Spain · LaLiga" },
      { matchId: `T:${day}:5`, home: "Inter", away: "Napoli", kickoff: "21:45", leagueName: "Italy · Serie A" },
      { matchId: `T:${day}:6`, home: "Bayern", away: "Dortmund", kickoff: "19:00", leagueName: "Germany · Bundesliga" }
    ].map(m => ({ ...m, id: m.matchId }));
  }

  function parseFromEl(itemEl) {
    return {
      id: itemEl.getAttribute("data-id") || "",
      matchId: itemEl.getAttribute("data-match-id") || "",
      home: itemEl.getAttribute("data-home") || "",
      away: itemEl.getAttribute("data-away") || "",
      kickoff: itemEl.getAttribute("data-kickoff") || "",
      leagueName: itemEl.getAttribute("data-league") || ""
    };
  }

  function ensureStyles() {
    if (document.getElementById("__today_panel_styles__")) return;
    const st = document.createElement("style");
    st.id = "__today_panel_styles__";
    st.textContent = `
      #today-list .today-item {
        display:flex; align-items:center; justify-content:space-between;
        gap:10px; padding:10px 12px; margin:8px 0;
        border:1px solid rgba(255,255,255,0.08);
        border-radius:14px;
        background:rgba(0,0,0,0.15);
        cursor:pointer; transition:background .15s ease;
      }
      #today-list .today-item:hover { background:rgba(0,0,0,0.25); }
      #today-list .t-left { flex:1; overflow:hidden; }
      #today-list .t-teams { font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      #today-list .t-sub { opacity:0.75; font-size:12px; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      #today-list .t-actions { display:flex; gap:8px; }
      #today-list .t-btn {
        width:32px; height:32px; border-radius:10px;
        display:flex; align-items:center; justify-content:center;
        border:1px solid rgba(255,255,255,0.10);
        background:rgba(0,0,0,0.2);
      }
      #today-list .t-star.active {
        color:#ffa400; border-color:rgba(255,164,0,0.3);
        background:rgba(255,164,0,0.1);
      }
      #today-list .t-details { color:#3db8ff; border-color:rgba(61,184,255,0.3); }
    `;
    document.head.appendChild(st);
  }

  function renderToday(listEl) {
    const matches = makeDemoTodayMatches();
    if (!matches.length) {
      listEl.innerHTML = `<div class="nav-empty">No matches today.</div>`;
      emitBus("today-matches:loaded", []);
      return;
    }

    listEl.innerHTML = matches.map(m => {
      const saved = isSaved(m.matchId);
      const sub = `${m.kickoff} · ${m.leagueName}`;
      return `
        <div class="today-item"
             data-id="${escapeHtml(m.matchId)}"
             data-match-id="${escapeHtml(m.matchId)}"
             data-home="${escapeHtml(m.home)}"
             data-away="${escapeHtml(m.away)}"
             data-kickoff="${escapeHtml(m.kickoff)}"
             data-league="${escapeHtml(m.leagueName)}">
          <div class="t-left">
            <div class="t-teams">${escapeHtml(m.home)} vs ${escapeHtml(m.away)}</div>
            <div class="t-sub">${escapeHtml(sub)}</div>
          </div>
          <div class="t-actions">
            <div class="t-btn t-details" title="Details">i</div>
            <div class="t-btn t-star ${saved ? "active" : ""}" title="${saved ? "Unsave" : "Save"}">${saved ? "★" : "☆"}</div>
          </div>
        </div>`;
    }).join("");

    // === Emit after render + debug log ===
    setTimeout(() => {
      console.log("[TODAY] emit today-matches:loaded", matches.length);
      emitBus("today-matches:loaded", { matches, ts: Date.now(), source: "today-panel" });
    }, 150);
  }

  function attachHandlers(listEl) {
    listEl.addEventListener("click", (ev) => {
      const item = ev.target.closest(".today-item");
      if (!item) return;
      const match = parseFromEl(item);

      if (ev.target.closest(".t-details")) {
        emitBus("match-selected", match);
        emitBus("details-open", match);
        return;
      }
      if (ev.target.closest(".t-star") && hasSavedStore()) {
        const nowSaved = window.SavedStore.toggle(match);
        ev.target.classList.toggle("active", !!nowSaved);
        ev.target.textContent = nowSaved ? "★" : "☆";
        emitBus("saved-updated", { id: match.matchId, match });
        return;
      }
      emitBus("match-selected", match);
    });
  }

  function init() {
    const el = document.getElementById("today-list");
    if (!el) return;
    ensureStyles();
    renderToday(el);
    attachHandlers(el);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else
    init();
  /* =========================================================
     DAILY CLEANUP ENGINE
     ---------------------------------------------------------
     Clears demo/today caches when the date changes
     Keeps app fresh each morning
  ========================================================= */
  try {
    const key = "AIML_LAST_TODAY_KEY";
    const last = localStorage.getItem(key);
    const now = todayKey();

    if (last && last !== now) {
      console.log("[TODAY] New day detected → clearing old demo data");
      // clear demo or temporary storage safely
      localStorage.removeItem("AIML_DEMO_TODAY");
      localStorage.removeItem("AIML_DEMO_SNAPSHOT");
      localStorage.removeItem("AIML_DEMO_STATE");
      localStorage.removeItem("AIML_TODAY_CACHE");
    }

    localStorage.setItem(key, now);
  } catch (err) {
    console.warn("[TODAY] Cleanup check failed", err);
  }

})();
