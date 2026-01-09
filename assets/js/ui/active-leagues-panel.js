(function () {
  "use strict";

  const LIST_ID = "active-leagues-list";

  function isLive(m) {
    return ["LIVE", "HT", "ET", "PEN"].includes(String(m.status).toUpperCase());
  }

  function kickoffTs(m) {
    return m.kickoff_ms || Infinity;
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  // ===============================
  // DETECT POSTPONED (ESPN FT 0-0)
  // ===============================
  function isPostponed(m) {
    return (
      String(m.status).toUpperCase() === "FT" &&
      (m.minute === "0'" || m.minute === "" || m.minute == null) &&
      m.scoreHome === 0 &&
      m.scoreAway === 0
    );
  }

  function render(matches) {
    const list = document.getElementById(LIST_ID);
    if (!list) return;

    clear(list);

    const byLeague = {};
    (matches || []).forEach(m => {
      if (isLive(m)) return;

      const league = m.leagueName || m.leagueSlug || "Unknown League";
      if (!byLeague[league]) byLeague[league] = [];
      byLeague[league].push(m);
    });

    const ordered = Object.keys(byLeague)
      .map(lg => ({
        league: lg,
        t: Math.min(...byLeague[lg].map(kickoffTs))
      }))
      .sort((a, b) => a.t - b.t);

    ordered.forEach(({ league }) => {
      const block = document.createElement("div");
      block.className = "active-league";

      const header = document.createElement("div");
      header.className = "active-league-header";

      const name = document.createElement("div");
      name.className = "active-league-name";
      name.textContent = league;

      header.appendChild(name);
      block.appendChild(header);

      byLeague[league]
        .sort((a, b) => kickoffTs(a) - kickoffTs(b))
        .forEach(m => {
          const clone = { ...m };

          // -------- POSTPONED ----------
          if (isPostponed(clone)) {
            // *** ΤΟ ΚΡΙΣΙΜΟ ***
            clone.scoreHome = null;
            clone.scoreAway = null;

            const row = document.createElement("div");
            row.className = "match-row postponed";

            const badge = document.createElement("span");
            badge.className = "match-badge pp";
            badge.textContent = "PP";

            row.appendChild(badge);
            row.appendChild(window.renderMatchRow(clone));
            block.appendChild(row);
            return;
          }

          // -------- NORMAL ----------
          if (String(clone.status).toUpperCase() === "FT") {
            clone.minute = "FT";
          }

          block.appendChild(window.renderMatchRow(clone));
        });

      list.appendChild(block);
    });
  }

  function init() {
    if (typeof window.on !== "function") {
      setTimeout(init, 50);
      return;
    }

    window.on("today-matches:loaded", payload => {
      render(payload.matches || []);
    });
  }

  init();
})();
