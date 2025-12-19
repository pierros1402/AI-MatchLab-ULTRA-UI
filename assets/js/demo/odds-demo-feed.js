/* ============================================================
   DEMO ODDS FEED — v2.11.0 (Live-Stable)
   ------------------------------------------------------------
   - Keeps canonical + radar pipeline identical (no UI changes)
   - Strengthens live:update heartbeat (independent of market)
   - Market changes no longer clear Live panel
   - Deterministic odds with smooth volatility
============================================================ */
(function () {
  "use strict";

  const TICK_MS = 15000;
  const THRESH_1X2 = 0.20;
  const THRESH_OTHER = 0.10;

  let dataset = [];
  let selected = null;
  let timer = null;
  let frame = 0;

  const GROUPS = ["greek", "eu", "asian", "betfair"];
  const GROUP_PROVIDERS = {
    greek: ["Bet365", "Stoiximan", "OPAP"],
    eu: ["Unibet", "Bwin", "Ladbrokes"],
    asian: ["Pinnacle", "SBOBET", "188BET"],
    betfair: ["Betfair Exchange", "Betfair Sportsbook"]
  };

  function emit(ev, data) {
    if (typeof window.emit === "function") window.emit(ev, data);
    else document.dispatchEvent(new CustomEvent(ev, { detail: data }));
  }

  function onSafe(ev, fn) {
    if (typeof window.on === "function") window.on(ev, fn);
    else document.addEventListener(ev, (e) => fn(e.detail));
  }

  /* ---------------------------- HELPERS ---------------------------- */
  function hash32(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rand01(key) {
    return (hash32(key) % 1000000) / 1000000;
  }

  function clampOdd(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(1.01, n) : 1.01;
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
    ].map((m, i) => ({
      id: `DEMO_${i + 1}`,
      matchId: `DEMO_${i + 1}`,
      home: m.home,
      away: m.away,
      league: m.league
    }));
  }

  function getCurrentMarket() {
    return (window.__AIML_CURRENT_MARKET__ || "1X2").trim() || "1X2";
  }
  const thresholdForMarket = (mk) =>
    String(mk || "1X2").trim() === "1X2" ? THRESH_1X2 : THRESH_OTHER;

  function baseOpening(mk, sel) {
    if (mk === "OU15") return sel === "Over" ? 1.85 : 1.95;
    if (mk === "OU25") return sel === "Over" ? 1.90 : 1.90;
    if (mk === "OU35") return sel === "Over" ? 2.30 : 1.60;
    if (mk === "GG") return 1.90;
    if (mk === "DC") return sel === "1X" ? 1.33 : sel === "12" ? 1.45 : 1.55;
    if (sel === "1") return 2.20;
    if (sel === "X") return 3.30;
    return 3.40;
  }

  function openingOdd(mid, prov, group, mk, sel) {
    const base = baseOpening(mk, sel);
    const r = rand01(`${mid}|${prov}|${mk}|${sel}|bias`);
    const g = rand01(`${group}|${mk}|${sel}|g`);
    return clampOdd(base + (r - 0.5) * 0.22 + (g - 0.5) * 0.06);
  }

  function currentOdd(open, mid, prov, group, mk, sel, frameNo) {
    const vol = group === "asian" ? 0.20 : group === "betfair" ? 0.18 : group === "greek" ? 0.24 : 0.19;
    const p = rand01(`${mid}|${prov}|${mk}|${sel}|p`) * Math.PI * 2;
    const a = (0.75 + rand01(`${mid}|${prov}|${mk}|${sel}|a`) * 0.5) * vol;
    const t = frameNo;
    const w = Math.sin(t * 0.55 + p) * a + Math.sin(t * 0.23 + p * 1.7) * a * 0.65;
    const d = (rand01(`${mid}|${prov}|${mk}|${sel}|d`) - 0.5) * 0.02;
    return clampOdd(open + w + d);
  }

  function marketSelections(mk) {
    if (mk === "DC") return ["1X", "12", "X2"];
    if (mk === "GG") return ["Yes", "No"];
    if (mk.startsWith("OU")) return ["Over", "Under"];
    return ["1", "X", "2"];
  }

  /* ---------------------- CANONICAL / RADAR ---------------------- */
  function buildCanonicalRows(mk, frameNo) {
  const rows = [];
  const sels = marketSelections(mk);

  for (const m of dataset) {
    for (const g of GROUPS) {
      const provs = GROUP_PROVIDERS[g];
      for (const prov of provs) {
        for (const sel of sels) { // <-- missing definition fixed here
          const open = openingOdd(m.id, prov, g, mk, sel);
          const cur = currentOdd(open, m.id, prov, g, mk, sel, frameNo);
          const delta = +(cur - open).toFixed(2);
          const abs = Math.abs(delta);
          rows.push({
            matchId: m.id,
            matchTitle: `${m.home} vs ${m.away}`,
            home: m.home,
            away: m.away,
            league: m.league,
            provider: prov,
            sel, // <-- variable now exists
            opening: +open.toFixed(2),
            current: +cur.toFixed(2),
            delta,
            abs,
            market: mk
            });
          }
        }
      }
    }
    return rows;
  }

  function bestMoves(rows, mk) {
    const thr = thresholdForMarket(mk);
    const best = Object.create(null);
    for (const r of rows) {
      const k = r.matchId;
      if (!best[k] || r.abs > best[k].abs) best[k] = r;
    }
    const moves = Object.values(best).filter((r) => r.abs >= thr);
    return { moves, thr };
  }

  /* ---------------------- LIVE SIMULATION ---------------------- */
  function buildLiveList() {
    return dataset.map((m) => ({
      id: m.id,
      home: m.home,
      away: m.away,
      minute: 10 + Math.floor(rand01(`${m.id}|${frame}|min`) * 75),
      score: `${Math.floor(rand01(`${m.id}|${frame}|s1`) * 3)} - ${Math.floor(
        rand01(`${m.id}|${frame}|s2`) * 3
      )}`
    }));
  }

  /* ---------------------- MAIN TICK ---------------------- */
  function tick() {
    if (!dataset.length) ensureFallbackDataset();
    if (!selected && dataset.length) selected = dataset[0];
    frame++;

    const mk = getCurrentMarket();
    const rows = buildCanonicalRows(mk, frame);
    const { moves, thr } = bestMoves(rows, mk);

    emit("odds-snapshot:canonical", {
      scope: "today",
      market: mk,
      threshold: thr,
      frame,
      rows,
      moves,
      ts: Date.now()
    });

    emit("radar-moves:update", {
      market: mk,
      threshold: thr,
      moves,
      ts: Date.now()
    });

    // Stable live heartbeat
    emit("live:update", { matches: buildLiveList(), ts: Date.now() });
  }

  /* ---------------------- EVENT WIRING ---------------------- */
  onSafe("matches-loaded", (list) => {
    if (Array.isArray(list) && list.length) {
      dataset = list;
      selected = dataset[0];
      tick();
    }
  });

  onSafe("match-selected", (m) => {
    selected = m;
    tick();
  });

  // Market change => refresh odds/radar but NOT live
  onSafe("market-selected", (mk) => {
    if (mk) window.__AIML_CURRENT_MARKET__ = mk;
    tick();
  });

  onSafe("radar:market-update", (mk) => {
    if (mk) window.__AIML_CURRENT_MARKET__ = mk;
    tick();
  });

  document.addEventListener("DOMContentLoaded", () => {
    ensureFallbackDataset();
    emit("matches-loaded", dataset);
    tick();
    if (timer) clearInterval(timer);
    timer = setInterval(tick, TICK_MS);
    console.log("[DEMO] v2.11.0 — Live-Stable canonical feed running");
  });
})();
