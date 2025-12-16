/* ============================================================
   DEMO ODDS FEED — Today universe for Radar + selected for Center
   ------------------------------------------------------------
   Center:
     - odds-demo:update / odds-snapshot (selected match)
   Right Radar overview:
     - radar-moves:update (ALL today matches with |Δ|>=0.20)
   Right Live demo:
     - live-demo:update (small rolling list)
============================================================ */

(function () {
  "use strict";

  const TICK_MS = 3000;
  const THRESH = 0.20;

  let dataset = [];
  let selected = null;
  let timer = null;

  // ---------------- bus helpers ----------------
  function emit(ev, data) {
    if (typeof window.emit === "function") window.emit(ev, data);
    else document.dispatchEvent(new CustomEvent(ev, { detail: data }));
  }
  function onSafe(ev, fn) {
    if (typeof window.on === "function") window.on(ev, fn);
    else document.addEventListener(ev, (e) => fn(e.detail));
  }

  // ---------------- dataset ----------------
  function loadDataset() {
    const d = window.demoDataset || window.DEMO_DATA;
    dataset = Array.isArray(d) ? d : [];
  }

  function injectMatchesOnce() {
    if (!dataset.length) return;

    emit("league-selected", {
      id: "DEMO_LEAGUE",
      name: "DEMO Matches of the Day",
      country: "EN",
      continent: "EU"
    });

    const matchList = dataset.map((m, i) => ({
      id: m.id || `DEMO_${i + 1}`,
      matchId: m.id || `DEMO_${i + 1}`,
      home: m.home,
      away: m.away,
      league: m.league || "Demo League",
      score: "0 - 0",
      minute: 0,
      odds: m.odds || null
    }));

    emit("matches-loaded", matchList);
  }

  // ---------------- odds helpers ----------------
  function clampOdd(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(1.01, n) : null;
  }
  function jitter(v, vol) {
    const n = clampOdd(v);
    if (n == null) return null;
    const delta = (Math.random() - 0.5) * 2 * vol;
    return clampOdd(n + delta);
  }
  function opening1X2(match) {
    const opening = match?.odds?.["1X2"]?.opening || match?.odds?.["1x2"]?.opening || {};
    const o1 = clampOdd(opening.home) ?? 2.20;
    const oX = clampOdd(opening.draw) ?? 3.30;
    const o2 = clampOdd(opening.away) ?? 3.40;
    return { o1, oX, o2 };
  }
  function mkMarkets(match, vol) {
    const { o1, oX, o2 } = opening1X2(match);
    function heavyJitter(v, idx) {
      const n = clampOdd(v);
      if (n == null) return v;
      const base = (Math.random() - 0.5) * 2 * vol;
      const bonus = (idx % 2 === 0 && Math.random() < 0.6)
        ? (0.20 + Math.random() * 0.25) * (Math.random() < 0.5 ? 1 : -1)
        : 0;
      return clampOdd(n + base + bonus);
    }
    return {
      "1X2": {
        "1": { opening: o1, current: heavyJitter(o1, 1) },
        "X": { opening: oX, current: heavyJitter(oX, 2) },
        "2": { opening: o2, current: heavyJitter(o2, 3) }
      }
    };
  }
  function maxMove(markets) {
    const m = markets?.["1X2"];
    if (!m) return null;
    const d1 = (m["1"].current - m["1"].opening);
    const dX = (m["X"].current - m["X"].opening);
    const d2 = (m["2"].current - m["2"].opening);
    const a1 = Math.abs(d1), aX = Math.abs(dX), a2 = Math.abs(d2);
    if (a1 >= aX && a1 >= a2) return { sel: "1", opening: m["1"].opening, current: m["1"].current, delta: d1, abs: a1 };
    if (aX >= a1 && aX >= a2) return { sel: "X", opening: m["X"].opening, current: m["X"].current, delta: dX, abs: aX };
    return { sel: "2", opening: m["2"].opening, current: m["2"].current, delta: d2, abs: a2 };
  }
  function labelForAbs(a) {
    if (a >= 0.40) return "Sharp drift";
    if (a >= 0.28) return "Drift";
    return "Move";
  }

  // ---------------- Center (selected match) ----------------
  function emitCenter(match) {
    if (!match) return;
    const id = match.matchId || match.id || "DEMO_SELECTED";
    const providers = {
      greek:   { markets: mkMarkets(match, 0.18) },
      eu:      { markets: mkMarkets(match, 0.15) },
      asian:   { markets: mkMarkets(match, 0.16) },
      betfair: { markets: mkMarkets(match, 0.14) }
    };
    const payload = {
      matchId: id,
      home: match.home,
      away: match.away,
      league: match.league,
      providers,
      updatedAt: Date.now()
    };
    emit("odds-demo:update", payload);
    emit("odds-snapshot", payload);
  }

  // ---------------- Radar overview ----------------
  function emitRadarOverview() {
    if (!dataset.length) return;
    const srcKeys = ["greek", "eu", "asian", "betfair"];
    const moves = [];
    for (let i = 0; i < dataset.length; i++) {
      const m = dataset[i];
      const matchId = m.id || m.matchId || `DEMO_${i + 1}`;
      const matchTitle = `${m.home || "Home"} vs ${m.away || "Away"}`;
      let best = null;
      for (const sk of srcKeys) {
        const vol = (sk === "greek") ? 0.26 : (sk === "asian") ? 0.22 : (sk === "betfair") ? 0.20 : 0.18;
        const mk = mkMarkets(m, vol);
        const mv = maxMove(mk);
        if (!mv) continue;
        const item = {
          matchId,
          matchTitle,
          source: sk,
          bookmaker: "Demo",
          sel: mv.sel,
          opening: mv.opening,
          current: mv.current,
          delta: +mv.delta.toFixed(2),
          abs: +mv.abs.toFixed(2),
          label: labelForAbs(mv.abs)
        };
        if (!best || item.abs > best.abs) best = item;
      }
      if (best && best.abs >= THRESH) moves.push(best);
    }
    moves.sort((a, b) => b.abs - a.abs);
    emit("radar-moves:update", {
      market: "1X2",
      threshold: THRESH,
      moves,
      ts: Date.now()
    });
  }

  // ---------------- Live demo ----------------
  function emitLiveDemo() {
    if (!dataset.length) return;
    const list = dataset.slice(0, 6).map((m, i) => ({
      id: m.id || m.matchId || `DEMO_${i + 1}`,
      home: m.home || "Home",
      away: m.away || "Away",
      minute: 10 + Math.floor(Math.random() * 75),
      score: "0 - 0"
    }));
    emit("live-demo:update", { matches: list, ts: Date.now() });
  }

  function tick() {
    if (selected) emitCenter(selected);
    emitRadarOverview();
    emitLiveDemo();
  }

  onSafe("match-selected", (m) => {
    selected = m;
    tick();
  });

  document.addEventListener("DOMContentLoaded", () => {
    loadDataset();
    injectMatchesOnce();
    if (dataset.length) selected = dataset[0];
    tick();
    if (timer) clearInterval(timer);
    timer = setInterval(tick, TICK_MS);
    console.log("[DEMO] Running: Center=selected match, Radar=Today overview.");
  });

  // === DEBUG + Bridge: Today -> Radar ===
  (function bindTodayLoaded() {
    const bind = () => {
      if (typeof window.on !== "function") return setTimeout(bind, 80);
      window.on("today-matches:loaded", (p) => {
        const arr = Array.isArray(p?.matches) ? p.matches : [];
        console.log("[DEMO] got today-matches:loaded", arr.length, p?.source || "");
        if (arr.length) {
          dataset = arr;
          selected = arr[0];
          emitRadarOverview();
        }
      });
      console.log("[DEMO] listener OK: today-matches:loaded");
    };
    bind();
  })();

})();
