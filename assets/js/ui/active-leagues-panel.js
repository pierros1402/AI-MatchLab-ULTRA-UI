/* =====================================================
   ACTIVE LEAGUES TODAY – FINAL (MATCH ROW ENABLED)
   - Ομαδοποίηση ανά λίγκα
   - PRE / LIVE → ώρα
   - FT → ΜΟΝΟ τελικό αποτέλεσμα
   - REPLAY από __AIML_LAST_TODAY__ (late load safe)
===================================================== */

(function () {
  if (!window.on || !window.renderMatchRow) return;

  const LIST_ID = "active-leagues-list";

  function normStatus(s) {
    return String(s || "").toUpperCase();
  }

  function isFinal(m) {
    const s = normStatus(m.status);
    return s === "FT" || s === "FINAL" || s === "AET" || s === "PEN";
  }

  function render(allMatches) {
    const list = document.getElementById(LIST_ID);
    if (!list) return;

    list.innerHTML = "";

    const matches = Array.isArray(allMatches) ? allMatches : [];
    if (!matches.length) {
      list.innerHTML =
        `<div class="empty-state">No active leagues today</div>`;
      return;
    }

    // group by league
    const byLeague = {};
    matches.forEach(m => {
      const lg = m.leagueName || "—";
      (byLeague[lg] = byLeague[lg] || []).push(m);
    });

    Object.keys(byLeague).forEach(league => {
      const leagueHeader = document.createElement("div");
      leagueHeader.className = "active-league-header";
      leagueHeader.textContent = league;
      list.appendChild(leagueHeader);

      const items = byLeague[league].slice().sort((a, b) => {
        const da = a.kickoff ? new Date(a.kickoff) : (a.kickoff_ms ? new Date(a.kickoff_ms) : null);
        const db = b.kickoff ? new Date(b.kickoff) : (b.kickoff_ms ? new Date(b.kickoff_ms) : null);
        if (!da || !db) return 0;
        return da - db;
      });

      items.forEach(m => {
        const final = isFinal(m);

        const row = renderMatchRow(m, {
          showTime: !final,     // PRE / LIVE
          showScore: final      // FT μόνο αποτέλεσμα
        });

        list.appendChild(row);
      });
    });
  }

  /* =====================================================
     EVENTS
  ===================================================== */
  on("today-matches:loaded", payload => {
    let matches = [];
    if (Array.isArray(payload)) matches = payload;
    else if (payload?.matches) matches = payload.matches;
    else if (payload?.items) matches = payload.items;
    render(matches);
  });

  /* =====================================================
     REPLAY (late load safe)
  ===================================================== */
  if (window.__AIML_LAST_TODAY__) {
    const p = window.__AIML_LAST_TODAY__;
    const matches = Array.isArray(p) ? p : (p.matches || p.items || []);
    render(matches);
  }
})();
