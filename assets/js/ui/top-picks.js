(function () {
  const listEl = document.getElementById("picks-list");
  const metaEl = document.getElementById("picks-meta");
  const btnAll = document.getElementById("btn-view-all-deviations");
  const allListEl = document.getElementById("deviations-list");

  let market = "1X2";
  let events = [];
  let showAll = false;

  function render() {
    const rows = events
      .filter(e => e.market === market)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    const top = rows.slice(0, 6);

    if (!top.length) {
      listEl.innerHTML = `<div class="right-empty">No picks</div>`;
      if (metaEl) metaEl.textContent = "0 / 0";
      return;
    }

    listEl.innerHTML = top.map(e => `
      <div class="right-row" data-id="${e.matchId}">
        <div class="rr-main">
          <div class="rr-title">${e.home} – ${e.away}</div>
          <div class="rr-sub">${e.book} · ${e.market}</div>
        </div>
        <div class="rr-delta">${e.delta > 0 ? "+" : ""}${e.delta.toFixed(2)}</div>
      </div>
    `).join("");

    if (metaEl) metaEl.textContent = `${top.length} / ${rows.length}`;

    if (allListEl) {
      allListEl.innerHTML = rows.map(e => `
        <div class="right-row" data-id="${e.matchId}">
          <div class="rr-main">
            <div class="rr-title">${e.home} – ${e.away}</div>
            <div class="rr-sub">${e.book} · ${e.market}</div>
          </div>
          <div class="rr-delta">${e.delta > 0 ? "+" : ""}${e.delta.toFixed(2)}</div>
        </div>
      `).join("");
    }
  }

  on("market-selected", m => {
    market = m;
    render();
  });

  // === REAL EVENTS ONLY ===
  on("odds-events:update", payload => {
    if (!payload || !Array.isArray(payload.events)) return;
    events = payload.events;
    render();
  });

  if (btnAll) {
    btnAll.addEventListener("click", () => {
      showAll = !showAll;
      listEl.classList.toggle("hidden", showAll);
      allListEl.classList.toggle("hidden", !showAll);
      btnAll.textContent = showAll ? "Back" : "View All";
    });
  }

})();
