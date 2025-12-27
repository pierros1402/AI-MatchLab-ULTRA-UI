/* ============================================================
   assets/js/live/live-adapter.js
   FINAL LIVE ADAPTER (NO DEMO)
============================================================ */
(function () {
  "use strict";

  const cfg = window.AIML_LIVE_CFG;
  if (!cfg || !cfg.emitLive) return;

  const BASE = (cfg.liveUltraBase || "").replace(/\/+$/, "");
  const PATH = cfg.liveUltraPath || "/api/unified-live";
  const INTERVAL = 15000;

  async function poll() {
    try {
      const res = await fetch(BASE + PATH, { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json();
      if (!data?.ok || !Array.isArray(data.matches)) return;

      const normalized = data.matches.map(m => {
  const sh = m.scoreHome ?? m.homeScore ?? null;
  const sa = m.scoreAway ?? m.awayScore ?? null;

  return {
    id: String(m.id),
    minute: m.minute ?? "",
    status: m.status ?? "",
    score_text:
      sh !== null && sa !== null
        ? `${sh}–${sa}`
        : ""
  };
});

window.emit?.("live:update", {
  ts: Date.now(),
  matches: normalized
});


    } catch (e) {
      console.warn("[live-adapter] fetch failed", e);
    }
  }

  poll();
  setInterval(poll, INTERVAL);
})();
