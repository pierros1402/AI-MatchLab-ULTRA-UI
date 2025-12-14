/* ============================================================
   AI MatchLab ULTRA — DEMO ODDS FEED (matches + center lock)
   Compatible with assets/js/ui/odds-panels.js

   Emits (global event bus emit()):
     - league-selected        (one time)
     - matches-loaded         (one time)
     - odds-demo:update       (selected match snapshots)
     - odds-snapshot          (same as above, for compatibility)

   Provides global controller expected by odds-panels.js:
     window.OddsDemoFeed.start(matchOrId)
     window.OddsDemoFeed.stop()

   Dataset source:
     window.demoDataset OR window.DEMO_DATA  (array of matches)
   Match odds format expected in dataset:
     match.odds["1X2"].opening/current = { home, draw, away }
============================================================ */

(function () {
  "use strict";

  const TICK_MS = 2500;

  let dataset = [];
  let timer = null;

  // lock center panels to one selected match
  let selectedMatchId = null;

  // -------------------------
  // Helpers
  // -------------------------
  function emit(ev, data) {
    if (typeof window.emit === "function") window.emit(ev, data);
    else document.dispatchEvent(new CustomEvent(ev, { detail: data }));
  }

  function loadDataset() {
    const d = window.demoDataset || window.DEMO_DATA;
    if (Array.isArray(d) && d.length) {
      dataset = d;
      console.log(`[DEMO] Loaded ${dataset.length} demo matches.`);
    } else {
      dataset = [];
      console.warn("[DEMO] demoDataset/DEMO_DATA not found or invalid format.");
    }
  }

  function clampOdd(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.max(1.01, n);
  }

  function jitter(v, vol = 0.08) {
    const n = clampOdd(v);
    if (n == null) return null;
    const delta = (Math.random() - 0.5) * 2 * vol;
    return clampOdd(n + delta);
  }

  function findMatchById(id) {
    if (!id || !dataset.length) return null;
    return dataset.find(m => (m && (m.id === id || m.matchId === id))) || null;
  }

  // Build markets object EXACTLY as odds-panels.js expects:
  // prov.markets = { "1X2": { "1":{opening,current}, "X":{...}, "2":{...} } }
  function buildMarkets(match) {
    const oddsBlock = (match.odds && (match.odds["1X2"] || match.odds["1x2"])) || {};
    const opening = oddsBlock.opening || {};
    const current = oddsBlock.current || opening;

    const o1 = clampOdd(opening.home) ?? 2.20;
    const oX = clampOdd(opening.draw) ?? 3.30;
    const o2 = clampOdd(opening.away) ?? 3.40;

    const c1 = jitter(current.home) ?? o1;
    const cX = jitter(current.draw) ?? oX;
    const c2 = jitter(current.away) ?? o2;

    return {
      "1X2": {
        "1": { opening: o1, current: c1 },
        "X": { opening: oX, current: cX },
        "2": { opening: o2, current: c2 }
      }
    };
  }

  function buildPayload(match) {
    const matchId = match.id || match.matchId;
    const markets = buildMarkets(match);

    return {
      matchId,
      home: match.home,
      away: match.away,
      league: match.league,
      meta: match.meta || null,
      providers: {
        greek:   { markets },
        eu:      { markets },
        asian:   { markets },
        betfair: { markets }
      }
    };
  }

  function pushSnapshotForSelected() {
    if (!selectedMatchId) return;
    const m = findMatchById(selectedMatchId);
    if (!m) return;

    const payload = buildPayload(m);
    emit("odds-demo:update", payload);
    emit("odds-snapshot", payload);
  }

  function tick() {
    // In this version we keep center stable:
    // only emit snapshots for the selected match.
    pushSnapshotForSelected();
  }

  function injectMatchesOnce() {
    if (!dataset.length) return;

    // Activate "demo league" (helps any UI that expects a league selection)
    emit("league-selected", {
      id: "DEMO_LEAGUE",
      name: "DEMO Matches of the Day",
      country: "EN",
      continent: "EU"
    });

    // Feed matches list to left panel (if it listens)
    const matchList = dataset.map((m, i) => ({
      id: m.id || `DEMO_${i + 1}`,
      matchId: m.id || `DEMO_${i + 1}`,
      home: m.home,
      away: m.away,
      league: m.league || "Demo League",
      score: "0 - 0",
      minute: 0,
      odds: m.odds || null,
      meta: m.meta || null
    }));

    emit("matches-loaded", matchList);
    console.log(`[DEMO] Injected ${matchList.length} matches into left panel.`);
  }

  // -------------------------
  // Public controller (expected by odds-panels.js)
  // -------------------------
  function start(selection) {
    // selection may be an object or an id
    const id = (selection && typeof selection === "object")
      ? (selection.matchId || selection.id)
      : selection;

    if (id) selectedMatchId = id;

    // Immediately push one snapshot so center panels wake up instantly
    pushSnapshotForSelected();
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  // Expose global API used by odds-panels.js
  window.OddsDemoFeed = {
    start,
    stop,
    getSelectedMatchId: () => selectedMatchId
  };

  // -------------------------
  // Boot
  // -------------------------
  document.addEventListener("DOMContentLoaded", () => {
    loadDataset();
    if (!dataset.length) return;

    injectMatchesOnce();

    // IMPORTANT: do NOT auto-select a match (user click decides),
    // but keep a safe default so the center is not empty if needed:
    selectedMatchId = (dataset[0] && (dataset[0].id || dataset[0].matchId)) ? (dataset[0].id || dataset[0].matchId) : null;
    pushSnapshotForSelected();

    stop();
    timer = setInterval(tick, TICK_MS);
    console.log("[DEMO] Demo odds feed running (center locked to selected match).");
  });

})();
