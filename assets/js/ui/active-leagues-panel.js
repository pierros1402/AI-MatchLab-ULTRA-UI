/* =====================================================
   ACTIVE LEAGUES TODAY – FINAL
   - Ομαδοποίηση ανά λίγκα
   - PRE / LIVE → ώρα
   - FT → ΜΟΝΟ τελικό αποτέλεσμα
   - Panel-level open / close (safe)
   - REPLAY από __AIML_LAST_TODAY__ (late load safe)
===================================================== */

(function () {
  if (!window.on || !window.renderMatchRow) return;

  const LIST_ID = "active-leagues-list";
  const PANEL_ID = "panel-active-leagues";
  const HEADER_SELECTOR = '[data-panel-toggle="active-leagues"]';

  let isOpen = true;

  function normStatus(s) {
    return String(s || "").toUpperCase();
  }

  function isFinal(m) {
    const s = normStatus(m.status);
    return s === "FT" || s === "FINAL" || s === "AET" || s === "PEN";
  }

  function applyPanelState() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    panel.classList.toggle("closed", !isOpen);
  }

  function bindHeaderToggle() {
    const header = document.querySelector(HEADER_SELECTOR);
    if (!header) return;

    header.addEventListener("click", () => {
      isOpen = !isOpen;
      applyPanelState();
    });
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
          showTime: !final,
          showScore: final
        });

        list.appendChild(row);
      });
    });
  }

  /* =====================================================
     EVENTS
  ===================================================== */
  on("today-matches:loaded", payload => {
  const all = payload?.matches || payload?.items || [];
    let matches = [];
    if (Array.isArray(payload)) matches = payload;
    else if (payload?.matches) matches = payload.matches;
    else if (payload?.items) matches = payload.items;
    render(matches);
  });

  /* =====================================================
     INIT
  ===================================================== */
  bindHeaderToggle();
  applyPanelState();

  /* =====================================================
     REPLAY (late load safe)
  ===================================================== */
  if (window.__AIML_LAST_TODAY__) {
    const p = window.__AIML_LAST_TODAY__;
    const matches = Array.isArray(p) ? p : (p.matches || p.items || []);
    render(matches);
  }
})();
