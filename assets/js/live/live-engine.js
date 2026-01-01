/* =====================================================
   LIVE ENGINE (TODAY-DRIVEN) – FINAL
   -----------------------------------------------------
   Single source of truth: TODAY PANEL
   - No fetch
   - No worker
   - No polling
   - BUT: lifecycle-safe (sleep / wake / focus)
===================================================== */

(function () {
  if (typeof window.on !== "function" || typeof window.emit !== "function") {
    console.warn("[live-engine] event bus not ready");
    return;
  }

  let lastLiveIds = new Set();
  let lastTodayPayload = null;

  // Listen to Today updates
  on("today-matches:loaded", handleToday);
  on("today:update", handleToday); // safety

  function handleToday(payload) {
    lastTodayPayload = payload;
    process(payload);
  }

  function process(payload) {
    const matches = Array.isArray(payload?.matches)
      ? payload.matches
      : Array.isArray(payload)
      ? payload
      : [];

    if (!matches.length) {
      emitEmpty();
      return;
    }

    const liveMatches = matches.filter((m) => {
      const s = String(m.status || "").toUpperCase();
      return s === "LIVE" || s === "HT" || s === "ET" || s === "PEN";
    });

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

  /* =====================================================
     LIFECYCLE RE-SYNC (THE FIX)
  ===================================================== */

  function resync(reason) {
    if (!lastTodayPayload) return;
    console.log("[live-engine] resync:", reason);
    process(lastTodayPayload);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      resync("visibility");
    }
  });

  window.addEventListener("focus", () => {
    resync("focus");
  });

  window.addEventListener("pageshow", () => {
    resync("pageshow");
  });

  console.log("[live-engine] READY (today-driven, lifecycle-safe)");
})();
