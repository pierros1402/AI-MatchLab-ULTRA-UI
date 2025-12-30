(function () {
  if (!window.on || !window.emit) return;

  const listEl = document.getElementById("today-list");
  if (!listEl) return;

  const FT_GRACE_MS = 3 * 60 * 1000;

  let currentLeagueFilter = null;
  let lastMatches = null; // 🔒 CRITICAL

  function clear() {
    listEl.innerHTML = "";
  }

  function formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString("el-GR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }

  function renderMatch(m) {
    if (window.renderMatchRow) return window.renderMatchRow(m);

    const row = document.createElement("div");
    row.className = "match-row";

    const left = document.createElement("div");
    left.className = "mr-left";
    const teams = document.createElement("div");
    teams.className = "mr-teams";
    teams.textContent = `${m.home} – ${m.away}`;
    left.appendChild(teams);

    const right = document.createElement("div");
    right.className = "mr-right";

    if (m.status === "LIVE") {
      right.classList.add("live");
      right.textContent = `LIVE ${m.minute || ""} ${m.scoreHome}-${m.scoreAway}`;
    } else if (m.status === "FT") {
      right.classList.add("ft");
      right.textContent = `FT ${m.scoreHome}-${m.scoreAway}`;
    } else {
      right.textContent = formatTime(m.kickoff);
    }

    row.appendChild(left);
    row.appendChild(right);
    row.onclick = () => window.emit("match-selected", m);
    return row;
  }

  function isVisible(m, now) {
    if (m.status === "LIVE") return true;
    if (m.status === "PRE") return true;
    if (m.status === "FT") {
      const approxEnd = (m.kickoff_ms || 0) + 110 * 60 * 1000;
      return now - approxEnd <= FT_GRACE_MS;
    }
    return false;
  }

  function render(matches) {
    if (!Array.isArray(matches)) return;
    lastMatches = matches; // 🔒 store truth

    clear();
    const now = Date.now();

    const visible = matches
      .filter(m => isVisible(m, now))
      .filter(m => !currentLeagueFilter || m.aimlLeagueId === currentLeagueFilter)
      .sort((a, b) => {
        if (a.status === "LIVE" && b.status !== "LIVE") return -1;
        if (b.status === "LIVE" && a.status !== "LIVE") return 1;
        if (a.status === "PRE" && b.status === "PRE") {
          return (a.kickoff_ms || 0) - (b.kickoff_ms || 0);
        }
        if (a.status === "FT" && b.status !== "FT") return 1;
        if (b.status === "FT" && a.status !== "FT") return -1;
        return (a.kickoff_ms || 0) - (b.kickoff_ms || 0);
      });

    if (!visible.length) {
      const empty = document.createElement("div");
      empty.className = "today-empty";
      empty.textContent = "No matches today";
      listEl.appendChild(empty);
      return;
    }

    const groups = {};
    visible.forEach(m => {
      const key = m.aimlLeagueId || "OTHER";
      if (!groups[key]) {
        groups[key] = { leagueName: m.leagueName || "Other", matches: [] };
      }
      groups[key].matches.push(m);
    });

    Object.values(groups).forEach(group => {
      const header = document.createElement("div");
      header.className = "today-league-header";
      header.textContent = group.leagueName;
      listEl.appendChild(header);
      group.matches.forEach(m => listEl.appendChild(renderMatch(m)));
    });
  }

  // 🔔 FIXTURES = SINGLE SOURCE OF TRUTH
  window.on("fixtures:loaded", payload => {
    const matches = payload?.matches || [];
    currentLeagueFilter = null; // 🔒 reset filter on fresh load
    render(matches);
  });

  // 🔔 ACTIVE FILTER (only if fixtures exist)
  window.on("active-league:selected", leagueId => {
    currentLeagueFilter = leagueId || null;
    if (lastMatches) render(lastMatches);
  });

  // 🔁 BOOTSTRAP
  if (window.__FIXTURES_LAST__?.matches) {
    render(window.__FIXTURES_LAST__.matches);
  }

  clear();
})();
