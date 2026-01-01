/* =====================================================
   FIXTURES LOADER — SINGLE SOURCE EMITTER
   -----------------------------------------------------
   Fetches /fixtures and emits TODAY events
===================================================== */

(function () {
  if (typeof emit !== "function") {
    console.warn("[fixtures-loader] event bus not ready");
    return;
  }

  const cfg = window.AIML_LIVE_CFG || {};
  const base = cfg.fixturesBase;
  const path = cfg.fixturesPath || "/fixtures";

  if (!base) {
    console.error("[fixtures-loader] fixturesBase missing");
    return;
  }

  const url = base + path;

  fetch(url)
    .then(r => r.json())
    .then(data => {
      const matches = Array.isArray(data?.matches) ? data.matches : [];

      console.log("[FIXTURES] loaded:", matches.length);

      // 🔑 THIS IS THE KEY FIX
     const payload = {
  source: "fixtures",
  matches
};

// 🔑 cache last payload for late subscribers
window.__AIML_LAST_TODAY__ = payload;

emit("today-matches:loaded", payload);

    })
    .catch(err => {
      console.error("[fixtures-loader] fetch failed", err);
      emit("today-matches:loaded", {
        source: "fixtures",
        matches: []
      });
    });
})();
