/*
 TODAY PANEL – FINAL STABLE
 - Shows PRE + LIVE only
 - FT removed immediately
 - Sorted strictly by kickoff time
 - League label shown ABOVE each match
 - LIVE: score + minute
 - PRE: kickoff time (24h)
 - No league grouping
*/

(function () {
  if (!window.on || !window.emit) return;

  function normalize(match) {
    const kickoffMs =
      match.kickoff_ms ||
      (match.kickoff ? Date.parse(match.kickoff) : 0);

    return {
      id: match.id,
      home: match.home,
      away: match.away,
      kickoff_ms: kickoffMs,
      status: match.status,
      minute: match.minute || "",
      scoreHome: match.scoreHome,
      scoreAway: match.scoreAway,
      leagueName:
        match.leagueName && match.leagueName !== "Unknown"
          ? match.leagueName
          : (match.leagueSlug || "—")
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
      const wrap = document.createElement("div");
      wrap.className = "today-match";

      // League (always visible, above match)
      const league = document.createElement("div");
      league.className = "match-league";
      league.textContent = m.leagueName;

      // Match row
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
        status.textContent = d.toLocaleTimeString("el-GR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        });
      }

      row.appendChild(teams);
      row.appendChild(status);

      wrap.appendChild(league);
      wrap.appendChild(row);
      root.appendChild(wrap);
    });
  }

  on("today-matches:loaded", payload => {
    if (!payload || !Array.isArray(payload.matches)) return;

    const list = payload.matches
      .map(normalize)
      .filter(isVisible)
      .sort((a, b) => a.kickoff_ms - b.kickoff_ms);

    render(list);
  });

})();
