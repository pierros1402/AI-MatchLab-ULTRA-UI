(function () {
  "use strict";

  if (window.__AIML_ODDS_CORE_BRIDGE__) return;
  window.__AIML_ODDS_CORE_BRIDGE__ = true;

  const WORKER_BASE = "https://aimatchlab-main.pierros1402.workers.dev";

  function onSafe(ev, fn) {
    if (typeof window.on === "function") window.on(ev, fn);
    else document.addEventListener(ev, e => fn(e.detail));
  }

  function emitSafe(ev, data) {
    if (typeof window.emit === "function") window.emit(ev, data);
    else document.dispatchEvent(new CustomEvent(ev, { detail: data }));
  }

  async function fetchCoreOdds(matchId) {
    try {
      const res = await fetch(
        `${WORKER_BASE}/odds/core?matchId=${encodeURIComponent(matchId)}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        console.warn("Core odds not available", matchId);
        return;
      }

      const data = await res.json();
      if (!data || !data.matchId) {
        console.warn("Invalid core odds payload", data);
        return;
      }

      emitSafe("odds-snapshot:core", data);
    } catch (err) {
      console.error("Core odds fetch failed", err);
    }
  }

  // === ONE SOURCE OF TRUTH ===
  // Any match click (Today / Live / Active) must emit "match-selected"
  onSafe("match-selected", match => {
    if (!match || !match.id) return;
    fetchCoreOdds(match.id);
  });

})();
