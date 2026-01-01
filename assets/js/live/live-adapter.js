(function () {
  if (typeof window.emit !== "function") return;

  // Αυτός ο adapter ΔΕΝ κρατά state
  // ΜΟΝΟ κανονικοποιεί και εκπέμπει

  function normalizeMatches(input) {
    if (Array.isArray(input)) return input;
    if (Array.isArray(input?.matches)) return input.matches;
    return [];
  }

  // ΑΚΟΥΕΙ ΜΟΝΟ fixtures:loaded (canonical object)
  window.on("fixtures:loaded", payload => {
    const matches = normalizeMatches(payload);

    // ✅ ΕΝΑ event name, ΕΝΑ shape
    window.emit("live:update", {
      matches,
      meta: {
        source: "live-adapter",
        ts: Date.now()
      }
    });
  });

})();
