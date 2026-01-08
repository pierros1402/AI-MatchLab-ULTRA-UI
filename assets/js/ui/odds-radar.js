(function () {
  const listEl = document.getElementById("radar-list");
  const metaEl = document.getElementById("radar-meta");

  let market = "1X2";
  let events = [];

  function clear(msg = "No signals") {
    if (listEl) listEl.innerHTML = `<div class="right-empty">${msg}</div>`;
    if (metaEl) metaEl.textContent = "Idle";
  }

  function render() {
    if (!events.length) {
      clear();
      return;
    }

    const rows = events
      .filter(e => e.market === market)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    if (!rows.length) {
      clear("No signals for market");
      return;
    }

    listEl.innerHTML = rows.map(e => {
      const cls = e.delta < 0 ? "odds-down" : "odds-up";
      return `
        <div class="right-row ${cls}" data-id="${e.matchId}">
          <div class="rr-main">
            <div class="rr-title">${e.home} – ${e.away}</div>
            <div class="rr-sub">${e.book} · ${e.market}</div>
          </div>
          <div class="rr-delta">${e.delta > 0 ? "+" : ""}${e.delta.toFixed(2)}</div>
        </div>
      `;
    }).join("");

    if (metaEl) metaEl.textContent = `${rows.length} signals`;
  }

  on("market-selected", m => {
    market = m;
    render();
  });

  // === REAL ASIAN CANONICAL EVENTS ===
  on("odds-events:update", payload => {
    if (!payload || !Array.isArray(payload.events)) return;
    events = payload.events;
    render();
  });

  if (listEl) {
    listEl.addEventListener("click", e => {
      const row = e.target.closest(".right-row");
      if (!row) return;
      const id = row.dataset.id;
      const ev = events.find(x => x.matchId === id);
      if (ev) emit("match-selected", ev);
    });
  }

  clear();
})();
