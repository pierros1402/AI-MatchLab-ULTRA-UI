/* =========================================================
   STATS DEMO FEED — v0.3
   - Emits ONLY: value:update  (for Value Picks)
   - Listens: matches-loaded, market-selected
   - Deterministic signals per match+market (no noise from odds)
========================================================= */
(function () {
  "use strict";

  if (window.__AIML_STATS_DEMO_FEED_V03__) return;
  window.__AIML_STATS_DEMO_FEED_V03__ = true;

  const TICK_MS = 20000; // slower than odds
  let dataset = [];
  let timer = null;

  function emit(ev, data) {
    if (typeof window.emit === "function") window.emit(ev, data);
    else document.dispatchEvent(new CustomEvent(ev, { detail: data }));
  }

  function onSafe(ev, fn) {
    if (typeof window.on === "function") window.on(ev, fn);
    else document.addEventListener(ev, (e) => fn(e.detail));
  }

  function normalizeMatch(m, i) {
    return {
      id: m?.id || m?.matchId || `DEMO_${i + 1}`,
      matchId: m?.matchId || m?.id || `DEMO_${i + 1}`,
      home: m?.home || "Home",
      away: m?.away || "Away",
      league: m?.league || "Demo League"
    };
  }

  function ensureFallbackDataset() {
    if (dataset.length) return;
    dataset = [
      { home: "Panathinaikos", away: "AEK", league: "Greece" },
      { home: "PAOK", away: "Olympiacos", league: "Greece" },
      { home: "Barcelona", away: "Sevilla", league: "Spain" },
      { home: "Real Madrid", away: "Valencia", league: "Spain" },
      { home: "Man City", away: "Arsenal", league: "England" },
      { home: "Liverpool", away: "Chelsea", league: "England" }
    ].map(normalizeMatch);
  }

  function getCurrentMarket() {
    return (window.__AIML_CURRENT_MARKET__ || "1X2").trim() || "1X2";
  }

  // --- deterministic PRNG from string (hash -> mulberry32)
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pickStatLabel(marketKey, r) {
    const mk = String(marketKey || "1X2").trim();

    if (mk === "1X2") {
      return r < 0.34 ? "Model: Home win" : r < 0.67 ? "Model: Draw" : "Model: Away win";
    }
    if (mk === "DC") {
      return r < 0.34 ? "Model: 1X" : r < 0.67 ? "Model: 12" : "Model: X2";
    }
    if (mk === "GG") {
      return r < 0.5 ? "Model: GG Yes" : "Model: GG No";
    }
    if (mk === "OU15") return r < 0.5 ? "Model: Over 1.5" : "Model: Under 1.5";
    if (mk === "OU25") return r < 0.5 ? "Model: Over 2.5" : "Model: Under 2.5";
    if (mk === "OU35") return r < 0.5 ? "Model: Over 3.5" : "Model: Under 3.5";

    return "Model signal";
  }

  function buildValuePicks(marketKey) {
    const mk = String(marketKey || "1X2").trim();
    if (!dataset.length) return [];

    const values = dataset.map((m) => {
      const seedFn = xmur3(`${m.id}::${mk}::VALUE_V03`);
      const rand = mulberry32(seedFn());
      const r1 = rand();
      const r2 = rand();

      // deterministic edge 2%..12% (just demo)
      const edge = 2 + r1 * 10;

      return {
        matchId: m.id,
        match: `${m.home} vs ${m.away}`,
        edge: +edge.toFixed(1),
        label: pickStatLabel(mk, r2),
        market: mk
      };
    });

    // sort by edge desc and keep top N
    values.sort((a, b) => (b.edge || 0) - (a.edge || 0));
    return values.slice(0, 8);
  }

  function tick() {
    if (!dataset.length) ensureFallbackDataset();
    const mk = getCurrentMarket();
    const values = buildValuePicks(mk);
    emit("value:update", { market: mk, values, ts: Date.now(), source: "stats-demo-feed" });
  }

  onSafe("matches-loaded", (list) => {
    if (Array.isArray(list) && list.length) {
      dataset = list.map(normalizeMatch);
      tick();
    }
  });

  onSafe("market-selected", (mk) => {
    if (mk) window.__AIML_CURRENT_MARKET__ = mk;
    tick();
  });

  document.addEventListener("DOMContentLoaded", () => {
    // if odds-demo-feed already fired matches-loaded before us, we still run with fallback dataset
    tick();
    if (timer) clearInterval(timer);
    timer = setInterval(tick, TICK_MS);
    console.log("[STATS DEMO] v0.3 — emits value:update only");
  });
})();
