// =====================================================
// CANONICAL BATCH → CORE SNAPSHOT (per match)
// =====================================================

(function () {
  if (typeof on !== "function" || typeof emit !== "function") return;

  let ACTIVE_MATCH_ID = null;

  on("match-selected", m => {
    ACTIVE_MATCH_ID = m?.id ? String(m.id) : null;
  });

  on("odds-snapshot:canonical", snap => {
    if (!ACTIVE_MATCH_ID || !Array.isArray(snap?.rows)) return;

    const rows = snap.rows.filter(r =>
      String(r.matchId) === ACTIVE_MATCH_ID
    );

    if (!rows.length) return;

    const markets = {};

    rows.forEach(r => {
      const mk = r.market || snap.market || "1X2";
      if (!markets[mk]) {
        markets[mk] = { greek: [], eu: [], asian: [], betfair: [] };
      }

      const group =
        r.bookGroup === "greek" ? "greek" :
        r.bookGroup === "asian" ? "asian" :
        r.bookGroup === "betfair" ? "betfair" : "eu";

      markets[mk][group].push({
        book: r.book,
        open: r.open,
        current: r.current,
        delta: r.delta
      });
    });

    emit("odds-snapshot:core", {
      matchId: ACTIVE_MATCH_ID,
      markets
    });
  });

})();
