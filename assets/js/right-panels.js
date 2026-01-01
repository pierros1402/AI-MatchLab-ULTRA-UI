/* =========================================================
   AI MatchLab ULTRA — Right Panels (LIVE ONLY)
   - Παίρνει ΜΟΝΟ από live:update
   - Χρήση renderMatchRow (shared component)
   - Grouping ανά λίγκα
========================================================= */

(function () {
  "use strict";
  if (!window.on || !window.renderMatchRow) return;

  const LIST_ID = "live-list";
  const META_ID = "live-meta";

  let matches = [];

  function render() {
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
     EVENTS
  ===================================================== */
  on("live:update", payload => {
    const list = payload?.matches || [];
    matches = Array.isArray(list) ? list : [];
    render();
  });

  render();
})();
