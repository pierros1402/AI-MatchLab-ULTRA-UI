(function () {
  if (!window.on || !window.renderMatchRow) return;

  const listEl = document.getElementById("saved-list");
  if (!listEl) return;

  function clear() {
    listEl.innerHTML = "";
  }

  function statusRank(m) {
    if (m.status === "LIVE") return 0;
    if (m.status === "PRE") return 1;
    return 2; // FT / άλλα
  }

  function render(matches) {
    clear();

    if (!matches || matches.length === 0) {
      const empty = document.createElement("div");
      empty.className = "list-empty";
      empty.textContent = "No saved matches";
      listEl.appendChild(empty);
      return;
    }

    matches
      .slice()
      .sort((a, b) => {
        const s = statusRank(a) - statusRank(b);
        if (s !== 0) return s;
        return (a.kickoff_ms || 0) - (b.kickoff_ms || 0);
      })
      .forEach(m => {
        listEl.appendChild(window.renderMatchRow(m));
      });
  }

  window.on("saved:updated", payload => {
    const matches = Array.isArray(payload?.items) ? payload.items : [];
    render(matches);
  });

  clear();
})();
