(function () {
  if (!window.on || !window.emit) return;

  const listEl = document.getElementById("active-leagues-list");
  if (!listEl) return;

  function clear() {
    listEl.innerHTML = "";
  }

  function render(leagues) {
    clear();
    Object.values(leagues).forEach(lg => {
      const row = document.createElement("div");
      row.className = "active-league-row";
      row.textContent = `${lg.leagueName} (${lg.count})`;

      row.onclick = () => {
        window.emit("active-league:selected", lg.aimlLeagueId);
      };

      listEl.appendChild(row);
    });
  }

  window.on("fixtures:loaded", payload => {
    const leagues = {};
    (payload?.matches || []).forEach(m => {
      if (!leagues[m.aimlLeagueId]) {
        leagues[m.aimlLeagueId] = {
          aimlLeagueId: m.aimlLeagueId,
          leagueName: m.leagueName,
          count: 0
        };
      }
      leagues[m.aimlLeagueId].count++;
    });
    render(leagues);
  });

  clear();
})();
