/* =====================================================
   TODAY PANEL – FINAL (MATCH ROW ENABLED)
   - LIVE + UPCOMING μόνο
   - Ομαδοποίηση ανά ώρα έναρξης
   - Χρήση renderMatchRow (shared component)
===================================================== */

(function () {
  if (!window.on || !window.renderMatchRow) return;

  const LIST_ID = "today-list";
  const LIVE_STATUSES = ["LIVE", "IN_PROGRESS", "ET", "AET", "PEN"];

  function normStatus(s) {
    return String(s || "").toUpperCase();
  }

  function isLiveStatus(status) {
    return LIVE_STATUSES.includes(normStatus(status));
  }

  function isUpcoming(status) {
    const s = normStatus(status);
    return s === "UPCOMING" || s === "SCHEDULED" || s === "PRE";
  }

  function getKickoffDate(m) {
    if (m.kickoff) return new Date(m.kickoff);
    if (m.kickoff_ms) return new Date(m.kickoff_ms);
    return null;
  }

  function render(allMatches) {
    const list = document.getElementById(LIST_ID);
    if (!list) return;

    list.innerHTML = "";

    const matches = (Array.isArray(allMatches) ? allMatches : []).filter(
      m => isLiveStatus(m.status) || isUpcoming(m.status)
    );

    window.AIML_TODAY_MATCHES = matches;

    if (!matches.length) {
      list.innerHTML =
        `<div class="empty-state">No live or upcoming matches</div>`;
      return;
    }

    const sorted = matches.slice().sort((a, b) => {
      const da = getKickoffDate(a);
      const db = getKickoffDate(b);
      if (!da || !db) return 0;
      return da - db;
    });

    const byTime = {};
    sorted.forEach(m => {
      const d = getKickoffDate(m);
      if (!d) return;
      const key =
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      (byTime[key] = byTime[key] || []).push(m);
    });

    Object.keys(byTime).forEach(timeKey => {
      const timeHeader = document.createElement("div");
      timeHeader.className = "today-time-header";
      timeHeader.textContent = timeKey;
      list.appendChild(timeHeader);

      const group = byTime[timeKey];

      const byLeague = {};
      group.forEach(m => {
        const lg = m.leagueName || "";
        (byLeague[lg] = byLeague[lg] || []).push(m);
      });

      Object.keys(byLeague).forEach(league => {
        const leagueHeader = document.createElement("div");
        leagueHeader.className = "today-league-header";
        leagueHeader.textContent = league;
        list.appendChild(leagueHeader);

        byLeague[league].forEach(m => {
          const live = isLiveStatus(m.status);

          const row = renderMatchRow(m, {
            showTime: !live,
            showMinute: live,
            showScore: live
          });

          list.appendChild(row);
        });
      });
    });
  }

  on("today-matches:loaded", payload => {
    const matches =
      payload?.matches ||
      payload?.items ||
      payload?.data ||
      [];
    render(matches);
  });

  if (window.__AIML_LAST_TODAY__) {
    const p = window.__AIML_LAST_TODAY__;
    const matches =
      p?.matches ||
      p?.items ||
      p?.data ||
      [];
    render(matches);
  }
})();
