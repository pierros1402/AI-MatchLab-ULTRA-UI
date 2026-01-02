/* =========================================================
   AI MatchLab ULTRA — Right Panels
   - LIVE: driven ONLY by live:update
   - Radar / Top Picks: toggled via tabs (UI-only)
   - Value & Live: ALWAYS visible / unchanged
   - Uses shared renderMatchRow
========================================================= */

(function () {
  "use strict";
  if (!window.on || !window.renderMatchRow) return;

  /* =====================================================
     LIVE PANEL (UNCHANGED)
  ===================================================== */

  const LIST_ID = "live-list";
  const META_ID = "live-meta";

  let matches = [];

  function renderLive() {
    const list = document.getElementById(LIST_ID);
    const meta = document.getElementById(META_ID);
    if (!list) return;

    list.innerHTML = "";

    if (meta) {
      meta.textContent = `Live • ${matches.length}`;
    }

    if (!matches.length) {
      list.innerHTML =
        `<div class="empty-state">No live matches right now</div>`;
      return;
    }

    // sort by kickoff
    const sorted = matches.slice().sort((a, b) => {
      const ka = a.kickoff_ms || 0;
      const kb = b.kickoff_ms || 0;
      return ka - kb;
    });

    // group by league
    const byLeague = {};
    sorted.forEach(m => {
      const lg = m.leagueName || "";
      (byLeague[lg] = byLeague[lg] || []).push(m);
    });

    Object.keys(byLeague).sort().forEach(league => {
      const leagueHeader = document.createElement("div");
      leagueHeader.className = "live-league-header";
      leagueHeader.textContent = league;
      list.appendChild(leagueHeader);

      byLeague[league].forEach(m => {
        const row = renderMatchRow(m, {
          showMinute: true,
          showScore: true
        });
        list.appendChild(row);
      });
    });
  }

  /* =====================================================
     RADAR / TOP PICKS TABS (UI ONLY)
  ===================================================== */

  function initIntelligenceTabs() {
    const tabs = document.querySelectorAll(".right-tab");
    if (!tabs.length) return;

    const radarCard = document.getElementById("card-radar");
    const picksCard = document.getElementById("card-top-picks");

    if (!radarCard || !picksCard) return;

    function activate(tabName) {
      tabs.forEach(btn =>
        btn.classList.toggle("active", btn.dataset.target === tabName)
      );

      radarCard.style.display = (tabName === "radar") ? "" : "none";
      picksCard.style.display = (tabName === "top-picks") ? "" : "none";
    }

    // default state
    activate("radar");

    tabs.forEach(btn => {
      btn.addEventListener("click", () => {
        activate(btn.dataset.target);
      });
    });
  }

  /* =====================================================
     EVENTS
  ===================================================== */

  on("live:update", payload => {
    const list = payload?.matches || [];
    matches = Array.isArray(list) ? list : [];
    renderLive();
  });

  // Init tabs once DOM is ready (safe)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initIntelligenceTabs);
  } else {
    initIntelligenceTabs();
  }

  renderLive();
})();
