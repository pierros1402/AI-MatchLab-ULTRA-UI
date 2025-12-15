/* =========================================================
   TODAY PANEL — AI MatchLab ULTRA (GLOBAL SCRIPT)
   - Renders demo "today matches" into #today-list
   - Row click => emit('match-selected', match)
   - ★ => SavedStore.toggle(match) (no auto-open Saved)
   - i => emit('details-open', match) + match-selected
========================================================= */

(function () {
  "use strict";

  if (window.__AIML_TODAY_PANEL_INIT__) return;
  window.__AIML_TODAY_PANEL_INIT__ = true;

  function emitBus(name, payload) {
    if (typeof window.emit === "function") window.emit(name, payload);
    else {
      try { document.dispatchEvent(new CustomEvent(name, { detail: payload })); } catch (_) {}
    }
  }

  function hasSavedStore() {
    return !!(window.SavedStore &&
      typeof window.SavedStore.toggle === "function" &&
      typeof window.SavedStore.isSaved === "function");
  }

  function isSaved(id) {
    try { return hasSavedStore() ? !!window.SavedStore.isSaved(id) : false; } catch { return false; }
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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

  function ensureStyles() {
    if (document.getElementById("aiml-today-style")) return;
    const st = document.createElement("style");
    st.id = "aiml-today-style";
    st.textContent = `
      #today-list .today-item{
        position:relative;
        padding:10px 82px 10px 12px;
        border:1px solid rgba(255,255,255,.10);
        border-radius:12px;
        margin:8px 0;
        cursor:pointer;
      }
      #today-list .today-item:hover{ background: rgba(255,255,255,.04); }
      #today-list .t-teams{ font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      #today-list .t-sub{ opacity:.75; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

      #today-list .t-actions{
        position:absolute; right:10px; top:50%; transform:translateY(-50%);
        display:flex; gap:8px; align-items:center;
      }
      #today-list .t-btn{
        width:30px; height:28px;
        display:flex; align-items:center; justify-content:center;
        border-radius:10px;
        border:1px solid rgba(255,255,255,.16);
        background: rgba(255,255,255,.06);
        font-weight:900;
        user-select:none;
        cursor:pointer;
        opacity:.9;
      }
      #today-list .t-btn:hover{ background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.24); }
      #today-list .t-star.active{
        background: rgba(61,255,184,.16);
        border-color: rgba(61,255,184,.35);
      }
      #today-list .t-details{
        background: rgba(61,184,255,.14);
        border-color: rgba(61,184,255,.32);
      }
      #today-list .t-details:hover{ background: rgba(61,184,255,.20); }
    `;
    document.head.appendChild(st);
  }

  function renderToday(listEl) {
    const matches = makeDemoTodayMatches();

    if (!matches.length) {
      listEl.innerHTML = `<div class="nav-empty" style="opacity:.7;padding:10px 6px;">No matches today.</div>`;
      return;
    }

    listEl.innerHTML = matches.map(m => {
      const saved = isSaved(m.matchId);
      const sub = `${m.kickoff || ""}${m.leagueName ? (m.kickoff ? " • " : "") + m.leagueName : ""}`.trim();
      return `
        <div class="today-item" data-mid="${escapeHtml(m.matchId)}"
             data-home="${escapeHtml(m.home)}" data-away="${escapeHtml(m.away)}"
             data-kickoff="${escapeHtml(m.kickoff || "")}" data-league="${escapeHtml(m.leagueName || "")}">
          <div class="t-teams">${escapeHtml(m.home)} vs ${escapeHtml(m.away)}</div>
          <div class="t-sub">${escapeHtml(sub)}</div>

          <div class="t-actions">
            <div class="t-btn t-details" title="Details" aria-label="Details">i</div>
            <div class="t-btn t-star ${saved ? "active" : ""}" title="${saved ? "Unsave" : "Save"}" aria-label="Save">
              ${saved ? "★" : "☆"}
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  function parseFromEl(el) {
    const mid = el.getAttribute("data-mid") || "";
    const home = el.getAttribute("data-home") || "";
    const away = el.getAttribute("data-away") || "";
    const kickoff = el.getAttribute("data-kickoff") || "";
    const leagueName = el.getAttribute("data-league") || "";
    return { id: mid, matchId: mid, home, away, kickoff, leagueName };
  }

  function syncStars(listEl) {
    const items = listEl.querySelectorAll(".today-item");
    items.forEach(it => {
      const id = it.getAttribute("data-mid");
      const star = it.querySelector(".t-star");
      if (!id || !star) return;
      const s = isSaved(id);
      star.classList.toggle("active", s);
      star.textContent = s ? "★" : "☆";
      star.title = s ? "Unsave" : "Save";
    });
  }

  function init() {
    const listEl = document.getElementById("today-list");
    if (!listEl) return;

    ensureStyles();
    renderToday(listEl);

    listEl.addEventListener("click", (ev) => {
      const item = ev.target.closest(".today-item");
      if (!item) return;

      const match = parseFromEl(item);

      // DETAILS (i)
      const detailsBtn = ev.target.closest(".t-details");
      if (detailsBtn) {
        ev.preventDefault(); ev.stopPropagation();
        emitBus("match-selected", match);
        emitBus("details-open", match);
        emitBus("details:open", match);
        emitBus("match-details", match);
        return;
      }

      // SAVED (★)
      const starBtn = ev.target.closest(".t-star");
      if (starBtn && hasSavedStore()) {
        ev.preventDefault(); ev.stopPropagation();
        const nowSaved = window.SavedStore.toggle(match);
        starBtn.classList.toggle("active", !!nowSaved);
        starBtn.textContent = nowSaved ? "★" : "☆";
        starBtn.title = nowSaved ? "Unsave" : "Save";
        emitBus("saved-updated", { id: match.matchId, match });
        return;
      }

      // ROW SELECT
      emitBus("match-selected", match);
    });

    // Keep stars synced when saved changes elsewhere
    if (typeof window.on === "function") {
      window.on("saved-updated", () => syncStars(listEl));
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

})();
