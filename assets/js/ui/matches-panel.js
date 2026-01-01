// ===================================================================
// MATCHES PANEL — FINAL (LIVE SAFE EXTENSION)
//
// • Δέχεται:
//   - navigation (league-selected, source:navigation)
//   - Active Leagues Today (active-league-selected)
// • Δείχνει ΟΛΟ το σημερινό πρόγραμμα:
//   LIVE / UPCOMING / FT / POSTPONED
// • LIVE overlay προστέθηκε ΧΩΡΙΣ να αλλάξει υπάρχουσα λογική
// ===================================================================
(function () {
  if (typeof window.on !== "function" || typeof window.emit !== "function") return;

  const panel = document.getElementById("panel-matches");
  if (!panel) return;

  const listEl = panel.querySelector("#matches-list");
  const titleEl = panel.querySelector(".panel-title");
  if (!listEl || !titleEl) return;

  let currentLeagueId = null;
  let allMatches = [];
  let liveMap = Object.create(null); // 🔴 LIVE OVERLAY (ΝΕΟ)

  // ---------------------------------------------------
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

  // ---------------------------------------------------
  function renderMatch(m) {
    // 👉 Αν υπάρχει κοινός renderer, ΤΟΝ ΧΡΗΣΙΜΟΠΟΙΟΥΜΕ
    if (typeof window.renderMatchRow === "function") {
      const live = liveMap[String(m.id)];
      if (live) {
        return window.renderMatchRow({
          ...m,
          status: "LIVE",
          minute: live.minute,
          scoreHome: live.scoreHome,
          scoreAway: live.scoreAway
        });
      }
      return window.renderMatchRow(m);
    }

    // Fallback (δεν θα έπρεπε να χρησιμοποιηθεί)
    const row = document.createElement("div");
    row.className = "match-row";
    row.textContent = `${m.home} – ${m.away}`;
    return row;
  }

  // ---------------------------------------------------
  function render(matches) {
    clear();

    if (!matches.length) {
      listEl.innerHTML = "<div class='empty'>No matches today</div>";
      return;
    }

    // ⛔ ΔΕΝ αλλάζουμε το υπάρχον sorting
    matches.sort((a, b) => {
      if (a.status === "LIVE" && b.status !== "LIVE") return -1;
      if (a.status !== "LIVE" && b.status === "LIVE") return 1;
      return 0;
    });

    matches.forEach(m => {
      listEl.appendChild(renderMatch(m));
    });
  }

  // ===================================================
  // EVENTS (ΟΛΑ ΤΑ ΥΠΑΡΧΟΝΤΑ + LIVE OVERLAY)
  // ===================================================

  // Από fixtures
  window.on("fixtures:loaded", payload => {
    allMatches = payload?.matches || [];
    render(allMatches);
  });

  // Από navigation
  window.on("league-selected", league => {
    currentLeagueId = league?.id || null;
    titleEl.textContent = league?.name || "Matches";

    const filtered = currentLeagueId
      ? allMatches.filter(m => m.aimlLeagueId === currentLeagueId)
      : allMatches;

    render(filtered);
  });

  // Από Active Leagues Today
  window.on("active-league:selected", leagueId => {
    currentLeagueId = leagueId || null;

    const filtered = currentLeagueId
      ? allMatches.filter(m => m.aimlLeagueId === currentLeagueId)
      : allMatches;

    render(filtered);
  });

  // ---------------------------------------------------
  // 🔴 LIVE OVERLAY (ΝΕΟ — ΔΕΝ ΣΠΑΕΙ ΤΙΠΟΤΑ)
  window.on("live-updated", payload => {
    liveMap = Object.create(null);

    (payload?.matches || []).forEach(m => {
      if (!m || !m.id) return;
      liveMap[String(m.id)] = m;
    });

    const filtered = currentLeagueId
      ? allMatches.filter(m => m.aimlLeagueId === currentLeagueId)
      : allMatches;

    render(filtered);
  });

})();
