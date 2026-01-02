/* =====================================================
   LIVE ENGINE (TODAY-DRIVEN) – FINAL
   -----------------------------------------------------
   Single source of truth: TODAY PANEL
   - No fetch
   - No worker
   - No polling
   - Lifecycle-safe (sleep / wake / focus)
===================================================== */

(function () {
  if (typeof window.on !== "function" || typeof window.emit !== "function") {
    console.warn("[live-engine] event bus not ready");
    return;
  }

  let lastSignature = "";
  let lastTodayPayload = null;

  /* =====================================================
     LISTENERS
  ===================================================== */

  // Full Today payload (safety)
  on("today-matches:loaded", payload => {
    lastTodayPayload = payload;
  });

  // 🔔 Canonical live signal from Today
  on("today:live-scan", payload => {
    if (!payload || !Array.isArray(payload.matches)) return;
    processLive(payload.matches);
  });

  function processLive(liveMatches) {
    const signature = liveMatches
      .map(m => `${m.id}:${m.status}`)
      .join("|");

    if (signature === lastSignature) return;
    lastSignature = signature;

    emit("live:update", {
      source: "today",
      total: liveMatches.length,
      matches: liveMatches
    });
  }

  /* =====================================================
     LIFECYCLE RE-SYNC
  ===================================================== */

  function resync(reason) {
    if (!lastTodayPayload) return;
    const matches = Array.isArray(lastTodayPayload?.matches)
      ? lastTodayPayload.matches
      : [];

    const liveMatches = matches.filter(m => {
      const s = String(m.status || "").toUpperCase();
      return (
        s === "LIVE" ||
        s === "IN_PROGRESS" ||
        s === "HT" ||
        s === "ET" ||
        s === "AET" ||
        s === "PEN"
      );
    });

    processLive(liveMatches);
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

  console.log("[live-engine] READY (today-driven)");
})();
