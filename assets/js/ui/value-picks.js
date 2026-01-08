(function () {
  const listEl = document.getElementById("value-picks-list");
  const metaEl = document.getElementById("value-picks-meta");

  function render(items) {
    if (!items || !items.length) {
      listEl.innerHTML = `<div class="right-empty">No value picks</div>`;
      if (metaEl) metaEl.textContent = "Idle";
      return;
    }

    listEl.innerHTML = items.map(i => `
      <div class="right-row">
        <div class="rr-main">
          <div class="rr-title">${i.home} – ${i.away}</div>
          <div class="rr-sub">${i.reason}</div>
        </div>
        <div class="rr-delta">${i.score.toFixed(2)}</div>
      </div>
    `).join("");

    if (metaEl) metaEl.textContent = `${items.length} picks`;
  }

  // === REAL STATS ONLY ===
  on("value:update", payload => {
    if (!payload || !Array.isArray(payload.items)) return;
    render(payload.items);
  });

  render();
})();
