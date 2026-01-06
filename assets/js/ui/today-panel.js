
/*
 TODAY PANEL – PATCHED
 - PRE + LIVE only
 - FT removed
 - Sorted by kickoff time
 - League label always shown
 - LIVE shows score + minute
 - PRE shows kickoff time only
*/

(function () {
  if (!window.on || !window.emit) return;

  function normalize(match) {
    return {
      id: match.id,
      home: match.home,
      away: match.away,
      kickoff_ms: match.kickoff_ms || Date.parse(match.kickoff),
      status: match.status,
      minute: match.minute || "",
      scoreHome: match.scoreHome,
      scoreAway: match.scoreAway,
      leagueName: match.leagueName || match.leagueSlug || "—"
    };
  }

  function isVisible(m) {
    return m.status === "LIVE" || m.status === "PRE";
  }

  function render(list) {
    const root = document.getElementById("today-list");
    if (!root) return;
    root.innerHTML = "";

    list.forEach(m => {
      const row = document.createElement("div");
      row.className = "match-row";

      const teams = document.createElement("div");
      teams.className = "match-teams";
      teams.textContent = `${m.home} – ${m.away}`;

      const status = document.createElement("div");
      status.className = "match-status";

      if (m.status === "LIVE") {
        status.textContent = `${m.scoreHome}-${m.scoreAway} ${m.minute}`;
        status.classList.add("live");
      } else {
        const d = new Date(m.kickoff_ms);
        status.textContent = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }

      const league = document.createElement("div");
      league.className = "match-league";
      league.textContent = m.leagueName;

      row.appendChild(teams);
      row.appendChild(status);
      row.appendChild(league);
      root.appendChild(row);
    });
  }

  on("today-matches:loaded", payload => {
    if (!payload || !payload.matches) return;

    const list = payload.matches
      .map(normalize)
      .filter(isVisible)
      .sort((a, b) => a.kickoff_ms - b.kickoff_ms);

    render(list);
  });

})();
