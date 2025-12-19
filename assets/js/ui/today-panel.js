/* =========================================================
   TODAY PANEL — AI MatchLab ULTRA (STABLE RESTORED)
   ---------------------------------------------------------
   - Always shows demo matches (fallback)
   - "Saved only" toggle (filters via SavedStore)
   - Emits 'today-matches:loaded'
========================================================= */

(function () {
  "use strict";
  if (window.__AIML_TODAY_PANEL_INIT__) return;
  window.__AIML_TODAY_PANEL_INIT__ = true;

  function emitBus(name, payload) {
    try {
      if (typeof window.emitBus === "function") window.emitBus(name, payload);
      else if (typeof window.emit === "function") window.emit(name, payload);
      else document.dispatchEvent(new CustomEvent(name, { detail: payload }));
    } catch (_) {}
  }

  function onBus(name, fn) {
    try {
      if (typeof window.onBus === "function") return window.onBus(name, fn);
      if (typeof window.on === "function") return window.on(name, fn);
    } catch (_) {}
    document.addEventListener(name, (e) => fn(e && e.detail));
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function hasSavedStore() {
    return !!(
      window.SavedStore &&
      typeof window.SavedStore.isSaved === "function" &&
      typeof window.SavedStore.toggle === "function"
    );
  }

  function isSaved(id) {
    try {
      return hasSavedStore() ? !!window.SavedStore.isSaved(id) : false;
    } catch {
      return false;
    }
  }

  function makeDemoTodayMatches() {
    return [
      { id: "T1", home: "Panathinaikos", away: "AEK", kickoff: "19:30", leagueName: "Greece · Super League" },
      { id: "T2", home: "Olympiacos", away: "PAOK", kickoff: "21:00", leagueName: "Greece · Super League" },
      { id: "T3", home: "Arsenal", away: "Chelsea", kickoff: "22:15", leagueName: "England · Premier League" },
      { id: "T4", home: "Barcelona", away: "Sevilla", kickoff: "20:45", leagueName: "Spain · LaLiga" },
      { id: "T5", home: "Inter", away: "Napoli", kickoff: "21:45", leagueName: "Italy · Serie A" },
      { id: "T6", home: "Bayern", away: "Dortmund", kickoff: "19:00", leagueName: "Germany · Bundesliga" }
    ];
  }

  function ensureStyles() {
    if (document.getElementById("__today_panel_styles__")) return;
    const st = document.createElement("style");
    st.id = "__today_panel_styles__";
    st.textContent = `
      #today-controls {
        display:flex; align-items:center; justify-content:flex-end;
        gap:10px; padding:10px 10px 6px 10px;
      }
      #today-controls .tc-toggle {
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(255,255,255,0.06);
        color:inherit;
        border-radius:999px;
        padding:6px 10px;
        font-weight:900;
        font-size:12px;
        cursor:pointer;
        user-select:none;
        white-space:nowrap;
      }
      #today-controls .tc-toggle.on {
        border-color:rgba(255,164,0,0.35);
        background:rgba(255,164,0,0.14);
      }
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

  const state = { savedOnly: false };

  function ensureControls(listEl) {
    if (document.getElementById("today-controls")) return;
    const wrap = document.createElement("div");
    wrap.id = "today-controls";
    wrap.innerHTML = `<button id="today-saved-only" class="tc-toggle" type="button">Saved only</button>`;
    listEl.parentNode.insertBefore(wrap, listEl);

    const btn = document.getElementById("today-saved-only");
    if (btn) {
      btn.addEventListener("click", () => {
        state.savedOnly = !state.savedOnly;
        btn.classList.toggle("on", state.savedOnly);
        renderToday(listEl);
      });
    }
  }

  function renderToday(listEl) {
    const base = makeDemoTodayMatches();
    const matches = state.savedOnly ? base.filter(m => isSaved(m.id)) : base;

    if (!matches.length) {
      const msg = state.savedOnly ? "No saved matches for today." : "No matches for today.";
      listEl.innerHTML = `<div class="nav-empty">${escapeHtml(msg)}</div>`;
      emitBus("today-matches:loaded", { matches, allMatches: base, filterSavedOnly: state.savedOnly });
      return;
    }

    listEl.innerHTML = matches.map(m => {
      const saved = isSaved(m.id);
      return `
        <div class="today-item" data-id="${escapeHtml(m.id)}" data-home="${escapeHtml(m.home)}" data-away="${escapeHtml(m.away)}">
          <div class="t-left">
            <div class="t-teams">${escapeHtml(m.home)} vs ${escapeHtml(m.away)}</div>
            <div class="t-sub">${escapeHtml(m.kickoff)} · ${escapeHtml(m.leagueName)}</div>
          </div>
          <div class="t-actions">
            <div class="t-btn t-details" title="Details">i</div>
            <div class="t-btn t-star ${saved ? "active" : ""}" title="${saved ? "Unsave" : "Save"}">${saved ? "★" : "☆"}</div>
          </div>
        </div>`;
    }).join("");

    emitBus("today-matches:loaded", { matches, allMatches: base, filterSavedOnly: state.savedOnly });
  }

  function attachHandlers(listEl) {
    if (listEl.__todayHandlers) return;
    listEl.__todayHandlers = true;

    listEl.addEventListener("click", ev => {
      const item = ev.target.closest(".today-item");
      if (!item) return;
      const match = {
        id: item.getAttribute("data-id"),
        home: item.getAttribute("data-home"),
        away: item.getAttribute("data-away")
      };

      if (ev.target.closest(".t-details")) {
        emitBus("match-selected", match);
        emitBus("details-open", match);
        return;
      }
      if (ev.target.closest(".t-star") && hasSavedStore()) {
        const nowSaved = window.SavedStore.toggle(match);
        ev.target.classList.toggle("active", !!nowSaved);
        ev.target.textContent = nowSaved ? "★" : "☆";
        if (state.savedOnly) renderToday(listEl);
        emitBus("saved-updated", { id: match.id, match });
        return;
      }
      emitBus("match-selected", match);
    });

    onBus("saved-store:updated", () => renderToday(listEl));
  }

  function init() {
    const el = document.getElementById("today-list");
    if (!el) return;
    ensureStyles();
    ensureControls(el);
    renderToday(el);
    attachHandlers(el);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
