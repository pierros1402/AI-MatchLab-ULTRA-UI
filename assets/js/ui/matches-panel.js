// ===================================================================
// MATCHES PANEL — FINAL
//
// • Δέχεται:
//   - navigation (league-selected, source:navigation)
//   - Active Leagues Today (active-league-selected)
// • Δείχνει ΟΛΟ το σημερινό πρόγραμμα:
//   LIVE / UPCOMING / FT / POSTPONED
// ===================================================================
(function () {
  const panel = document.getElementById("panel-matches");
  if (!panel) return;

  const listEl = panel.querySelector("#matches-list");
  const titleEl = panel.querySelector(".panel-title");
  const subEl = panel.querySelector(".matches-hdr-sub");

  function ymdAthens(d) {
    const tz = new Date(
      d.toLocaleString("en-US", { timeZone: "Europe/Athens" })
    );
    const z = (n) => String(n).padStart(2, "0");
    return tz.getFullYear() + z(tz.getMonth() + 1) + z(tz.getDate());
  }

  async function loadLeague(leagueId, leagueName) {
    if (titleEl) titleEl.textContent = leagueName || "Matches";
    if (subEl) subEl.textContent = "Today";

    listEl.innerHTML = "<div class='loading'>Loading…</div>";

    const today = ymdAthens(new Date());
    const url =
      window.AIML_LIVE_CFG.fixturesBase +
      window.AIML_LIVE_CFG.fixturesPath +
      `?league=${leagueId}&date=${today}&days=1&includeFinished=1&scope=all`;

    try {
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      const arr = j.matches || [];
      render(arr);
    } catch (e) {
      console.warn("[matches-panel] fetch failed", e);
      listEl.innerHTML = "<div class='empty'>Failed to load matches</div>";
    }
  }

  function render(matches) {
    if (!matches.length) {
      listEl.innerHTML = "<div class='empty'>No matches today</div>";
      return;
    }

    matches.sort((a, b) => {
      if (a.status === "LIVE" && b.status !== "LIVE") return -1;
      if (a.status !== "LIVE" && b.status === "LIVE") return 1;
      return 0;
    });

    listEl.innerHTML = matches
      .map((m) => {
        let sub = "";

        if (m.status === "LIVE") {
          sub = `<span class="live">LIVE ${m.minute || ""}'</span>`;
        } else if (
          m.status === "FT" ||
          m.status === "FINAL" ||
          m.status === "FINISHED"
        ) {
          sub = `<span class="ft">FT ${m.homeScore ?? ""}–${m.awayScore ?? ""}</span>`;
        } else if (
          m.status === "POSTPONED" ||
          m.status === "CANCELLED" ||
          m.status === "CANCELED" ||
          m.status === "ABANDONED" ||
          m.status === "SUSPENDED" ||
          m.status === "DELAYED"
        ) {
          sub = `<span class="postponed">${m.status}</span>`;
        } else {
          const t = new Date(m.kickoff);
          sub = `<span class="time">${t.toLocaleTimeString("el-GR", {
            hour: "2-digit",
            minute: "2-digit"
          })}</span>`;
        }

        return `
          <div class="match-row">
            <div class="teams">${m.home} – ${m.away}</div>
            <div class="sub">${sub}</div>
          </div>
        `;
      })
      .join("");
  }

  // EVENTS
  window.on("league-selected", (p) => {
    if (!p || !p.id || p.source !== "navigation") return;
    loadLeague(p.id, p.name);
  });

  window.on("active-league-selected", (p) => {
    if (!p || !p.id) return;
    loadLeague(p.id, p.name);
  });
})();
