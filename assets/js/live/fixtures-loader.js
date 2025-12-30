(function () {
  if (!window.emit) return;

  const cfg = window.AIML_LIVE_CFG || {};
  const base = cfg.fixturesBase;
  const path = cfg.fixturesPath || "/fixtures";

  if (!base) return;

  fetch(base + path)
    .then(r => r.json())
    .then(data => {
      console.log("[FIXTURES] loaded:", data?.matches?.length || 0);

      // 🔒 GLOBAL CACHE (CRITICAL)
      window.__FIXTURES_LAST__ = data;

      // 🔔 EVENT
      window.emit("fixtures:loaded", data);
    })
    .catch(err => {
      console.error("[FIXTURES] failed", err);

      const empty = { matches: [] };

      // 🔒 still cache, so Today boots correctly
      window.__FIXTURES_LAST__ = empty;
      window.emit("fixtures:loaded", empty);
    });
})();
