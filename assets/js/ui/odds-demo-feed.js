/* ============================================================
   DEMO ODDS FEED — v2.10.0 (Canonical + Deterministic)
   - Deterministic odds (no Math.random)
   - Keeps legacy events: odds-demo:update, odds-snapshot (selected match payload)
   - Adds canonical event: odds-snapshot:canonical (rows across Today matches)
   - Radar/Top driven from deterministic canonical rows
   - Thresholds: 1X2>=0.20, Others>=0.10
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

  // ---------------------------------------------------------
  //  BUS HELPERS
  // ---------------------------------------------------------
  function emit(ev, data) {
    if (typeof window.emit === "function") window.emit(ev, data);
    else document.dispatchEvent(new CustomEvent(ev, { detail: data }));
  
    // HISTORY (daily overwrite, keeps last N days via history-engine)
    try {
      if (window.AIMLHistory && typeof window.AIMLHistory.saveSnapshot === "function") {
        if (ev === "odds-snapshot:canonical") window.AIMLHistory.saveSnapshot("odds:canonical", data);
        else if (ev === "odds-snapshot") window.AIMLHistory.saveSnapshot("odds:selected", data);
        else if (ev === "radar-moves:update") window.AIMLHistory.saveSnapshot("radar:moves", data);
        else if (ev === "live:update") window.AIMLHistory.saveSnapshot("live", data);
      }
    } catch (_) {}
  }

  function onSafe(ev, fn) {
    if (typeof window.on === "function") window.on(ev, fn);
    else document.addEventListener(ev, (e) => fn(e.detail));
  }

  // ---------------------------------------------------------
  //  NORMALIZE + FALLBACK
  // ---------------------------------------------------------
  function normalizeMatch(m, i) {
    return {
      id: m?.id || m?.matchId || `DEMO_${i + 1}`,
      matchId: m?.matchId || m?.id || `DEMO_${i + 1}`,
      home: m?.home || m?.homeName || "Home",
      away: m?.away || m?.awayName || "Away",
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

  // ---------------------------------------------------------
  //  MARKET + THRESHOLD
  // ---------------------------------------------------------
  function getCurrentMarket() {
    return (window.__AIML_CURRENT_MARKET__ || "1X2").trim() || "1X2";
  }

  function thresholdForMarket(mk) {
    const k = String(mk || "1X2").trim();
    return k === "1X2" ? THRESH_1X2 : THRESH_OTHER;
  }

  // ---------------------------------------------------------
  //  DETERMINISTIC RNG / HASH
  // ---------------------------------------------------------
  function hash32(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rand01(key) {
    // stable 0..1 from string
    return (hash32(key) % 1000000) / 1000000;
  }

  function clampOdd(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(1.01, n) : null;
  }

  // ---------------------------------------------------------
  //  PROVIDERS (bookmaker names)
  // ---------------------------------------------------------
  const GROUPS = ["greek", "eu", "asian", "betfair"];

  const GROUP_PROVIDERS = {
    greek: ["Bet365", "Stoiximan", "OPAP"],
    eu: ["Unibet", "Bwin", "Ladbrokes"],
    asian: ["Pinnacle", "SBOBET", "188BET"],
    betfair: ["Betfair Exchange", "Betfair Sportsbook"]
  };

  function groupVol(groupKey) {
    // deterministic volatility by group
    if (groupKey === "greek") return 0.24;
    if (groupKey === "asian") return 0.20;
    if (groupKey === "betfair") return 0.18;
    return 0.19; // eu
  }

  // ---------------------------------------------------------
  //  MARKET DEFINITIONS
  // ---------------------------------------------------------
  function marketSelections(mk) {
    const k = String(mk || "1X2").trim();
    if (k === "DC") return ["1X", "12", "X2"];
    if (k === "GG") return ["Yes", "No"];
    if (k === "OU15") return ["Over", "Under"];
    if (k === "OU25") return ["Over", "Under"];
    if (k === "OU35") return ["Over", "Under"];
    return ["1", "X", "2"]; // 1X2 default
  }

  function baseOpening(mk, selKey) {
    const k = String(mk || "1X2").trim();
    const s = String(selKey || "").trim();

    if (k === "OU15") return s === "Over" ? 1.85 : 1.95;
    if (k === "OU25") return s === "Over" ? 1.90 : 1.90;
    if (k === "OU35") return s === "Over" ? 2.30 : 1.60;

    if (k === "GG") return s === "Yes" ? 1.90 : 1.90;

    if (k === "DC") {
      if (s === "1X") return 1.33;
      if (s === "12") return 1.45;
      return 1.55; // X2
    }

    // 1X2
    if (s === "1") return 2.20;
    if (s === "X") return 3.30;
    return 3.40; // "2"
  }

  function selLabel(mk, selKey) {
    const k = String(mk || "1X2").trim();
    const s = String(selKey || "").trim();

    if (k === "OU15") return s === "Over" ? "Over 1.5" : "Under 1.5";
    if (k === "OU25") return s === "Over" ? "Over 2.5" : "Under 2.5";
    if (k === "OU35") return s === "Over" ? "Over 3.5" : "Under 3.5";

    return s; // 1X2/DC/GG
  }

  // ---------------------------------------------------------
  //  DETERMINISTIC OPEN/CURRENT
  // ---------------------------------------------------------
  function openingOdd(matchId, providerName, groupKey, mk, selKey) {
    const base = baseOpening(mk, selKey);

    // small stable bias per match+provider+selection
    const r = rand01(`${matchId}|${providerName}|${mk}|${selKey}|openBias`);
    const bias = (r - 0.5) * 0.22; // ~ +/-0.11

    // group micro bias
    const g = rand01(`${groupKey}|${mk}|${selKey}|gBias`);
    const gbias = (g - 0.5) * 0.06;

    return clampOdd(base + bias + gbias);
  }

  function currentOdd(open, matchId, providerName, groupKey, mk, selKey, frameNo) {
    const vol = groupVol(groupKey);

    // stable phase/amplitude per pair
    const p = rand01(`${matchId}|${providerName}|${mk}|${selKey}|phase`) * Math.PI * 2;
    const a = (0.75 + rand01(`${matchId}|${providerName}|${mk}|${selKey}|amp`) * 0.50) * vol;

    const t = frameNo;

    // two sine components for smooth movement
    const w1 = Math.sin(t * 0.55 + p) * a;
    const w2 = Math.sin(t * 0.23 + p * 1.7) * (a * 0.65);

    // tiny drift so it doesn't “stick”
    const d = (rand01(`${matchId}|${providerName}|${mk}|${selKey}|drift`) - 0.5) * 0.02;

    return clampOdd(open + w1 + w2 + d);
  }

  // ---------------------------------------------------------
  //  CANONICAL ROWS (Today overview)
  // ---------------------------------------------------------
  function buildCanonicalRows(mk, frameNo) {
    const marketKey = String(mk || "1X2").trim();
    const sels = marketSelections(marketKey);
    const rows = [];

    for (let i = 0; i < dataset.length; i++) {
      const m = dataset[i];
      const matchId = m.id;
      const matchTitle = `${m.home} vs ${m.away}`;

      for (const gk of GROUPS) {
        const provs = GROUP_PROVIDERS[gk] || [gk];

        for (let p = 0; p < provs.length; p++) {
          const providerName = provs[p];

          for (let s = 0; s < sels.length; s++) {
            const selKey = sels[s];

            const open = openingOdd(matchId, providerName, gk, marketKey, selKey);
            const cur = currentOdd(open, matchId, providerName, gk, marketKey, selKey, frameNo);

            if (!Number.isFinite(open) || !Number.isFinite(cur)) continue;

            const delta = cur - open;
            const abs = Math.abs(delta);

            // probability delta (for later; NOT used in thresholds now)
            const pOpen = 1 / open;
            const pCur = 1 / cur;
            const dp = pCur - pOpen;
            const dpAbs = Math.abs(dp);

            rows.push({
              matchId,
              matchTitle,
              home: m.home,
              away: m.away,
              league: m.league,

              market: marketKey,
              providerGroup: gk,
              provider: providerName,

              selKey,
              sel: selLabel(marketKey, selKey),

              opening: +open.toFixed(2),
              current: +cur.toFixed(2),
              delta: +delta.toFixed(2),
              abs: +abs.toFixed(2),

              pOpen: +pOpen.toFixed(4),
              pCur: +pCur.toFixed(4),
              dp: +dp.toFixed(4),
              dpAbs: +dpAbs.toFixed(4)
            });
          }
        }
      }
    }

    return rows;
  }

  function bestMovePerMatch(rows, mk) {
    const marketKey = String(mk || "1X2").trim();
    const limit = thresholdForMarket(marketKey);

    const best = Object.create(null);

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const key = r.matchId || r.matchTitle || `M_${i}`;
      if (!best[key] || (r.abs || 0) > (best[key].abs || 0)) best[key] = r;
    }

    const moves = Object.values(best)
      .filter((r) => Number.isFinite(r.abs) && r.abs >= limit)
      .sort((a, b) => (b.abs || 0) - (a.abs || 0))
      .map((r) => ({
        matchId: r.matchId,
        matchTitle: r.matchTitle,
        home: r.home,
        away: r.away,
        provider: r.provider,
        sel: r.sel,
        opening: r.opening,
        current: r.current,
        delta: r.delta,
        abs: r.abs
      }));

    return { moves, limit };
  }

  // ---------------------------------------------------------
  //  SELECTED MATCH PAYLOAD (legacy compatibility)
  // ---------------------------------------------------------
  function buildSelectedPayload(m, mk, frameNo) {
    if (!m) return null;
    const marketKey = String(mk || "1X2").trim();
    const sels = marketSelections(marketKey);

    // legacy shape expects providers.{group}.markets[marketKey][selKey] = {opening,current}
    const providers = {};

    for (const gk of GROUPS) {
      const provs = GROUP_PROVIDERS[gk] || [gk];
      const providerName = provs[0]; // deterministic representative
      const mm = {};
      mm[marketKey] = {};

      for (let s = 0; s < sels.length; s++) {
        const selKey = sels[s];
        const open = openingOdd(m.id, providerName, gk, marketKey, selKey);
        const cur = currentOdd(open, m.id, providerName, gk, marketKey, selKey, frameNo);
        mm[marketKey][selKey] = {
          opening: +Number(open).toFixed(2),
          current: +Number(cur).toFixed(2)
        };
      }

      providers[gk] = { markets: mm };
    }

    return {
      matchId: m.id,
      home: m.home,
      away: m.away,
      league: m.league,
      providers,
      updatedAt: Date.now()
    };
  }

  // ---------------------------------------------------------
  //  LIVE DEMO (unchanged)
  // ---------------------------------------------------------
  function emitLiveDemo() {
    if (!dataset.length) return;
    const list = dataset.slice(0, 10).map((m) => ({
      id: m.id,
      home: m.home,
      away: m.away,
      minute: 10 + Math.floor(rand01(`${m.id}|${frame}|min`) * 75),
      score: `${Math.floor(rand01(`${m.id}|${frame}|s1`) * 3)} - ${Math.floor(rand01(`${m.id}|${frame}|s2`) * 3)}`
    }));
    emit("live:update", { matches: list, ts: Date.now() });
  }

  // ---------------------------------------------------------
  //  MAIN TICK
  // ---------------------------------------------------------
  function tick() {
    if (!dataset.length) ensureFallbackDataset();
    if (!selected && dataset.length) selected = dataset[0];

    const mkKey = getCurrentMarket();
    frame++;

    // Legacy selected payload (kept)
    if (selected) {
      const payload = buildSelectedPayload(selected, mkKey, frame);
      if (payload) {
        emit("odds-demo:update", payload);
        emit("odds-snapshot", payload); // legacy event preserved
      }
    }

    // Canonical snapshot (Today overview)
    const rows = buildCanonicalRows(mkKey, frame);
    const bm = bestMovePerMatch(rows, mkKey);

    emit("odds-snapshot:canonical", {
      scope: "today",
      market: mkKey,
      threshold: bm.limit,
      frame,
      ts: Date.now(),
      rowsCount: rows.length,
      matchesCount: dataset.length,
      rows,
      // optional convenience
      moves: bm.moves
    });

    // Radar/Top consumption stays the same
    emit("radar-moves:update", { market: mkKey, threshold: bm.limit, moves: bm.moves, ts: Date.now() });

    // Live
    emitLiveDemo();
  }

  // ---------------------------------------------------------
  //  WIRING
  // ---------------------------------------------------------
  onSafe("matches-loaded", (list) => {
    if (!Array.isArray(list) || !list.length) return;
    dataset = list.map(normalizeMatch);
    if (!selected && dataset.length) selected = dataset[0];
    tick();
  });

  onSafe("match-selected", (m) => {
    selected = normalizeMatch(m, 0);
    tick();
  });

  onSafe("market-selected", (mk) => {
    if (mk) window.__AIML_CURRENT_MARKET__ = String(mk).trim() || "1X2";
    // Clear Radar quickly (optional)
    emit("radar-moves:update", { market: mk, threshold: thresholdForMarket(mk), moves: [], ts: Date.now() });
    tick();
  });

  // Right panels may emit this; support it safely
  onSafe("radar:market-update", (mk) => {
    if (mk) window.__AIML_CURRENT_MARKET__ = String(mk).trim() || "1X2";
    tick();
  });

  document.addEventListener("DOMContentLoaded", () => {
    ensureFallbackDataset();
    emit("matches-loaded", dataset);
    tick();
    if (timer) clearInterval(timer);
    timer = setInterval(tick, TICK_MS);
    console.log("[DEMO] v2.10.0 — Canonical+Deterministic (odds-snapshot:canonical)");
  });
})();
