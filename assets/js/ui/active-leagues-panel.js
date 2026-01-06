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

      const h = document.createElement("div");
      h.className = "active-league-title";
      h.textContent = league;
      block.appendChild(h);

      byLeague[league]
        .sort((a, b) => kickoffTs(a) - kickoffTs(b))
        .forEach(m => {
          const clone = { ...m };
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
