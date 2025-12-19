/* =========================================================
   AI MATCHLAB ULTRA – TODAY PANEL (v1.4 Safe Hook)
   Renders today's matches from either:
     • demo feed (fallback)
     • live-adapter.js (event: today-matches:loaded)
   Also supports Save ★ and Details (i).
========================================================= */
(function () {
  "use strict";

  const elList = document.getElementById("today-list");
  if (!elList) return;

  const fmt = (x) => (x == null ? "" : String(x));
  const esc = (s) => s.replace(/[&<>]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));

  // --------------------------------------------------------
  // Internal state
  const state = {
    matches: [],
    liveSource: "demo",
    lastRenderHash: "",
  };

  // --------------------------------------------------------
  // RENDER FUNCTION
  function render() {
    const arr = state.matches || [];
    const h = String(arr.length) + ":" + JSON.stringify(arr).length;
    if (h === state.lastRenderHash) return;
    state.lastRenderHash = h;

    if (!arr.length) {
      elList.innerHTML = `<div class="list-empty">No matches today.</div>`;
      return;
    }

    elList.innerHTML = arr
      .map((m) => {
        const mid = m.id || m.matchId || m.match_id || "unknown";
        const home = esc(fmt(m.home));
        const away = esc(fmt(m.away));
        const tSrc = m.start_time || m.utcDate || ((m.date && m.time) ? (String(m.date) + "T" + String(m.time) + ":00Z") : "");
        const time = tSrc
          ? `<div class="today-time">${esc(String(tSrc).slice(11, 16))}</div>`
          : "";
        const league = m.league ? `<div class="today-league">${esc(m.league)}</div>` : "";

        return `
          <div class="list-item today-item" data-id="${mid}">
            <div class="today-main">
              <div class="today-names">${home} <span class="vs">vs</span> ${away}</div>
              ${time}
            </div>
            ${league}
            <div class="today-actions">
              <button class="btn-save" title="Save" data-id="${mid}">★</button>
              <button class="btn-details" title="Details" data-id="${mid}">i</button>
            </div>
          </div>`;
      })
      .join("");
  }

  // --------------------------------------------------------
  // EVENT HANDLERS
  function handleSaveClick(e) {
    const btn = e.target.closest(".btn-save");
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;
    window.emit && window.emit("saved:toggle", { id });
  }

  function handleDetailsClick(e) {
    const btn = e.target.closest(".btn-details");
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;
    const match = state.matches.find((m) => m.id === id || m.matchId === id || m.match_id === id);
    if (match) window.emit && window.emit("details:open", { match });
  }

  elList.addEventListener("click", (e) => {
    handleSaveClick(e);
    handleDetailsClick(e);
  });

  // --------------------------------------------------------
  // SAFE HOOKS (LIVE + DEMO)
  function wireHooks() {
    if (typeof window.on !== "function" || typeof window.emit !== "function") {
      setTimeout(wireHooks, 200);
      return;
    }

    // ---- DEMO FEED (fallback) ----
    window.on("today-demo:update", (p) => {
      if (!p || !Array.isArray(p.matches)) return;
      state.matches = p.matches;
      state.liveSource = "demo";
      render();
    });

    // ---- LIVE FEED (from live-adapter.js) ----
    window.on("today-matches:loaded", (p) => {
      if (!p || !Array.isArray(p.matches)) return;
      state.matches = p.matches;
      state.liveSource = p.source || "live";
      render();
    });
  }

  // --------------------------------------------------------
  // INITIAL RENDER
  elList.innerHTML = `<div class="list-empty">Loading today's matches...</div>`;
  wireHooks();

})();
