/* =====================================================
   LIVE ENGINE (TODAY-DRIVEN)
   -----------------------------------------------------
   Single source of truth: TODAY PANEL
   - No fetch
   - No worker
   - No demo
   - Pure filter + emit
===================================================== */

(function () {
  if (typeof window.on !== "function" || typeof window.emit !== "function") {
    console.warn("[live-engine] event bus not ready");
    return;
  }

  let lastLiveIds = new Set();

  // Listen ONLY to today updates
  on("today-matches:loaded", handleToday);
  on("today:update", handleToday); // safety (if you emit this elsewhere)

  function handleToday(payload) {
    const matches = Array.isArray(payload?.matches)
      ? payload.matches
      : Array.isArray(payload)
      ? payload
      : [];

    if (!matches.length) {
      emitEmpty();
      return;
    }

    // LIVE-ish statuses (worker normalizes to LIVE/HT/ET/PEN)
    const liveMatches = matches.filter((m) => {
      const s = String(m.status || '').toUpperCase();
      return s === 'LIVE' || s === 'HT' || s === 'ET' || s === 'PEN';
    });

    // Build stable id set to avoid noisy re-renders
    const ids = new Set(liveMatches.map((m) => m.id));
    if (sameSet(ids, lastLiveIds)) return;

    lastLiveIds = ids;

    emit("live:update", {
      source: "today",
      total: liveMatches.length,
      matches: liveMatches
    });
  }

  function emitEmpty() {
    if (lastLiveIds.size === 0) return;
    lastLiveIds.clear();

    emit("live:update", {
      source: "today",
      total: 0,
      matches: []
    });
  }

  function sameSet(a, b) {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }

  console.log("[live-engine] READY (today-driven)");
})();