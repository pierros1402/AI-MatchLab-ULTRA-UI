(function () {
  if (typeof window.on !== "function" || typeof window.emit !== "function") return;

  let lastPayload = null;
  let activeDateKey = null;
  const TZ = "Europe/Athens";

  /* =========================
     TIME HELPERS
     ========================= */

  function pad2(n) { return String(n).padStart(2, "0"); }

  function dayKeyFromMsGR(ms) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).formatToParts(new Date(ms));
      const y = parts.find(p => p.type === "year")?.value;
      const m = parts.find(p => p.type === "month")?.value;
      const d = parts.find(p => p.type === "day")?.value;
      return y && m && d ? `${y}-${m}-${d}` : "";
    } catch {
      const d = new Date(ms);
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }
  }

  /* =========================
     HELPERS
     ========================= */

  function normalize(match) {
    if (!match) return null;

    const kickoffMs =
      match.kickoff_ms ||
      (match.kickoff ? Date.parse(match.kickoff) : 0);

    return Object.assign({}, match, {
      kickoff_ms: kickoffMs,
      leagueName: match.leagueName || match.leagueSlug || "—",
      leagueSlug: match.leagueSlug || "",
      __dayKeyGR: kickoffMs ? dayKeyFromMsGR(kickoffMs) : ""
    });
  }

  function isVisible(m) {
    return m && (m.status === "PRE" || m.status === "LIVE");
  }

  /* =========================
     RENDER
     ========================= */

  function render(matches) {
    const root = document.getElementById("active-leagues-list");
    if (!root) return;

    root.innerHTML = "";

    if (!matches || !matches.length) {
      root.textContent = "Δεν υπάρχουν ενεργές λίγκες.";
      return;
    }

    const map = {};

    matches.forEach(m => {
      const nm = normalize(m);
      if (!nm || !isVisible(nm)) return;

      if (activeDateKey && nm.__dayKeyGR !== activeDateKey) return;

      const key = nm.leagueSlug || nm.leagueName;
      if (!map[key]) {
        map[key] = {
          leagueName: nm.leagueName,
          leagueSlug: nm.leagueSlug,
          count: 0
        };
      }
      map[key].count++;
    });

    Object.values(map)
      .sort((a, b) => b.count - a.count)
      .forEach(lg => {
        const row = document.createElement("div");
        row.className = "active-league-row";
        row.innerHTML = `
          <span class="league-name">${lg.leagueName}</span>
          <span class="league-count">${lg.count}</span>
        `;

        row.onclick = () => {
          emit("league-selected", {
            leagueSlug: lg.leagueSlug,
            leagueName: lg.leagueName,
            source: "active-leagues"
          });
        };

        root.appendChild(row);
      });
  }

  /* =========================
     EVENTS
     ========================= */

  on("today-matches:loaded", payload => {
    if (!payload || !Array.isArray(payload.matches)) return;

    lastPayload = payload;
    render(payload.matches);
  });

  on("today-date:changed", ({ dateKey }) => {
    if (!lastPayload || !dateKey) return;

    activeDateKey = dateKey;
    render(lastPayload.matches || []);
  });

})();
