/* ============================================================
   AI MatchLab ULTRA — odds-panels.js (OPENING vs CURRENT + SNAPSHOT EMIT)
   - Unified Market dropdown in Active Match Bar
   - Default market: 1X2
   - Renders Opening/Current (O/C) per bookmaker row (demo generator)
   - Emits odds snapshots for Right Panels + Radar:
       • "odds-snapshot"   { matchId, home, away, league, providers.{greek,eu,asian,betfair}.markets }
       • "odds-demo:update" (compat alias)
       • "market-selected" { key }
   - No imports/exports (classic global script)
============================================================ */

(function () {
  "use strict";
  if (window.__AIML_ODDS_PANELS_V4__) return;
  window.__AIML_ODDS_PANELS_V4__ = true;

  // -------------------------
  // Constants / Wiring
  // -------------------------
  const BODY_IDS = {
    greek: "greek-odds-body",
    eu: "eu-odds-body",
    asian: "asian-odds-body",
    betfair: "betfair-odds-body",
  };

  // Visible bookmaker rows (center panels). These are *display rows* only.
  const GROUP_PROVIDERS = {
    greek: ["Bet365", "Stoiximan", "OPAP"],
    eu: ["William Hill", "Ladbrokes", "Unibet", "Bwin"],
    asian: ["Pinnacle", "SBO", "188BET", "12BET", "MaxBet"],
    betfair: ["Betfair Exchange", "Betfair SP"],
  };

  // Canonical market keys (must match emitted payload + Right Panels)
  const MARKETS = [
    { key: "1X2",  label: "1X2",            cols: ["1", "X", "2"] },
    { key: "DC",   label: "Double Chance",  cols: ["1X", "12", "X2"] },
    { key: "OU25", label: "O/U 2.5",        cols: ["Over 2.5", "Under 2.5"] },
    { key: "BTTS", label: "BTTS",           cols: ["Yes", "No"] },
    { key: "DNB",  label: "Draw No Bet",    cols: ["1 (DNB)", "2 (DNB)"] },
    { key: "AH0",  label: "Asian Handicap 0.0", cols: ["1 (0.0)", "2 (0.0)"] },
  ];

  // Backward compatibility (old stored keys)
  const LEGACY_MARKET_MAP = {
    h2h: "1X2",
    dc: "DC",
    ou25: "OU25",
    btts: "BTTS",
    dnb: "DNB",
    ah0: "AH0",
  };

  const LS_MARKET = "aiml_market_key_v3"; // keep existing storage key; migrate values internally
  const TICK_MS = 2500;

  // provider-group bias (used for emitted snapshot only)
  const GROUP_BIAS = { greek: 0.22, eu: 0.35, asian: 0.48, betfair: 0.60 };

  // -------------------------
  // State
  // -------------------------
  let ACTIVE_MATCH = null;         // { id, home, away, leagueName/league, ... }
  let ACTIVE_MARKET = "1X2";       // canonical market key
  let TICK = 0;
  let TIMER = null;

  // -------------------------
  // Helpers
  // -------------------------
  const el = (id) => document.getElementById(id);

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function nowTime() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  function normalizeStoredMarket(raw) {
    const k = String(raw || "").trim();
    if (!k) return "1X2";
    if (LEGACY_MARKET_MAP[k]) return LEGACY_MARKET_MAP[k];
    if (MARKETS.some((m) => m.key === k)) return k;
    return "1X2";
  }

  function getMarket(key) {
    const k = normalizeStoredMarket(key);
    return MARKETS.find((m) => m.key === k) || MARKETS[0];
  }

  function clamp(x, a, b) {
    return Math.max(a, Math.min(b, x));
  }

  function seedFromMatch(match) {
    const s = `${match?.id || ""}|${match?.home || ""}|${match?.away || ""}|${match?.league || match?.leagueName || ""}`;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000; // 0..1
  }

  // -------------------------
  // Inline CSS (neutral)
  // -------------------------
  function injectStylesOnce() {
    if (document.getElementById("aiml-odds-panels-v4-style")) return;
    const st = document.createElement("style");
    st.id = "aiml-odds-panels-v4-style";
    st.textContent = `
      /* Market tab in Active Match Bar */
      .aiml-amb-row{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
      .aiml-amb-left{ min-width:0; }
      .aiml-amb-right{ flex:0 0 auto; position:relative; }
      .aiml-market-btn{
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.16);
        background: rgba(255,255,255,0.08);
        color: inherit;
        font-weight: 900;
        font-size: 12px;
        padding: 8px 10px;
        cursor: pointer;
        user-select:none;
      }
      .aiml-market-menu{
        position:absolute;
        right:0;
        top: 42px;
        min-width: 200px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.18);
        background: rgba(10,12,22,0.92);
        box-shadow: 0 18px 40px rgba(0,0,0,0.35);
        padding: 8px;
        z-index: 9999;
        display:none;
      }
      .aiml-market-menu.open{ display:block; }
      .aiml-market-item{
        padding: 10px 10px;
        border-radius: 10px;
        cursor:pointer;
        font-weight: 800;
        font-size: 12px;
        margin-bottom: 6px;
        background: rgba(255,255,255,0.06);
      }
      .aiml-market-item:last-child{ margin-bottom:0; }
      .aiml-market-item:hover{ background: rgba(255,255,255,0.10); }
      .aiml-market-item.active{ outline: 2px solid rgba(255,255,255,0.22); }

      /* Table rendering */
      .aiml-odds-wrap{ display:block; }
      .aiml-odds-table{
        width:100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      .aiml-odds-table th, .aiml-odds-table td{
        padding: 10px 10px;
        border-top: 1px solid rgba(255,255,255,0.08);
        vertical-align: top;
      }
      .aiml-provider{
        font-weight: 900;
        white-space: nowrap;
        max-width: 120px;
        overflow:hidden;
        text-overflow: ellipsis;
      }
      .aiml-cell{ display:flex; align-items:center; gap:8px; }
      .aiml-open{ opacity: .80; font-weight: 800; }
      .aiml-cur{ font-weight: 950; }
      .aiml-arrow{ opacity:.85; font-weight: 900; }
      .aiml-empty{ opacity:.75; font-size: 12px; padding: 8px 6px; }
    `;
    document.head.appendChild(st);
  }

  // -------------------------
  // Demo snapshot generator (OPENING vs CURRENT)
  // -------------------------
  function demoPrices(seed, providerBias, tick) {
    const drift = (Math.sin((seed * 10 + providerBias) * 6 + tick) + 1) * 0.5; // 0..1
    const favBias = (seed - 0.5) * 0.7;

    const home = clamp(2.10 - favBias * 0.8, 1.45, 3.50);
    const away = clamp(2.30 + favBias * 0.9, 1.55, 4.20);
    const draw = clamp(3.20 + (0.5 - Math.abs(seed - 0.5)) * 0.8, 2.60, 4.20);

    const over = clamp(1.92 + (seed - 0.5) * 0.18, 1.65, 2.25);
    const under = clamp(1.92 - (seed - 0.5) * 0.18, 1.65, 2.25);

    const bttsYes = clamp(1.88 + (seed - 0.5) * 0.20, 1.55, 2.40);
    const bttsNo = clamp(1.92 - (seed - 0.5) * 0.18, 1.55, 2.55);

    // tick influences the oscillation slightly (for "current")
    const k = 0.06 * (drift - 0.5);

    return {
      "1X2": { "1": home, "X": draw, "2": away, curK: k },
      "DC":  { "1X": clamp(1.35 + 0.05 * drift, 1.20, 1.55), "12": clamp(1.30 + 0.04 * drift, 1.18, 1.55), "X2": clamp(1.40 + 0.05 * drift, 1.20, 1.65), curK: k },
      "OU25":{ "Over 2.5": over, "Under 2.5": under, curK: k },
      "BTTS":{ "Yes": bttsYes, "No": bttsNo, curK: k },
      "DNB": { "1 (DNB)": clamp(home - 0.18, 1.25, 3.10), "2 (DNB)": clamp(away - 0.18, 1.25, 3.60), curK: k },
      "AH0": { "1 (0.0)": clamp(1.90 - favBias * 0.25, 1.55, 2.35), "2 (0.0)": clamp(1.90 + favBias * 0.25, 1.55, 2.35), curK: k },
    };
  }

  function fmt(x) {
    if (x == null || !isFinite(x)) return "—";
    return Number(x).toFixed(2);
  }

  function arrow(openV, curV) {
    if (openV == null || curV == null) return "";
    const d = curV - openV;
    if (Math.abs(d) < 0.005) return "→";
    return d < 0 ? "↓" : "↑";
  }

  function cell(openV, curV) {
    const a = arrow(openV, curV);
    return `
      <div class="aiml-cell">
        <span class="aiml-open">O:${fmt(openV)}</span>
        <span class="aiml-cur">C:${fmt(curV)}</span>
        <span class="aiml-arrow">${a}</span>
      </div>
    `;
  }

  function headerCols(market) {
    let th = `<th style="text-align:left;">Book</th>`;
    for (const c of market.cols) th += `<th style="text-align:left;">${esc(c)} (O/C)</th>`;
    return th;
  }

  // -------------------------
  // Unified Market UI in Active Match Bar
  // -------------------------
  function ensureMarketPicker() {
    injectStylesOnce();

    const bar = document.getElementById("active-match-bar");
    if (!bar) return;

    // wrap existing left text into a row
    let row = bar.querySelector(".aiml-amb-row");
    if (!row) {
      const left = document.createElement("div");
      left.className = "aiml-amb-left";
      while (bar.firstChild) left.appendChild(bar.firstChild);

      const right = document.createElement("div");
      right.className = "aiml-amb-right";

      row = document.createElement("div");
      row.className = "aiml-amb-row";
      row.appendChild(left);
      row.appendChild(right);

      bar.appendChild(row);
    }

    const host = row.querySelector(".aiml-amb-right");
    if (!host) return;

    if (host.__marketPickerBound) return;
    host.__marketPickerBound = true;

    const btn = document.createElement("button");
    btn.className = "aiml-market-btn";
    btn.type = "button";

    const menu = document.createElement("div");
    menu.className = "aiml-market-menu";

    host.appendChild(btn);
    host.appendChild(menu);

    // outside click closes
    document.addEventListener("click", () => menu.classList.remove("open"), { passive: true });

    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      menu.classList.toggle("open");
    });

    host.__setActive = function (key) {
      const m = getMarket(key);
      btn.textContent = `${m.label} ▾`;
      menu.innerHTML = "";

      for (const it of MARKETS) {
        const item = document.createElement("div");
        item.className = "aiml-market-item" + (it.key === m.key ? " active" : "");
        item.textContent = it.label;

        item.addEventListener("click", (ev) => {
          ev.stopPropagation();
          menu.classList.remove("open");
          setActiveMarket(it.key);
        });

        menu.appendChild(item);
      }
    };

    host.__setActive(ACTIVE_MARKET);
  }

  function updateActiveMatchBarText(match) {
    // match-selected-fix.js owns amb-title/amb-sub, but we keep this as fallback.
    const t = document.getElementById("amb-title");
    const s = document.getElementById("amb-sub");
    if (!t || !s) return;

    if (!match) {
      t.textContent = "No match selected";
      s.textContent = "Select a match from the left panel.";
      return;
    }

    const home = match.home || match.homeName || "Home";
    const away = match.away || match.awayName || "Away";
    const league = match.leagueName || match.league || "";
    const time = match.displayTime || match.kickoff || match.time || "";

    t.textContent = `${home} vs ${away}`;
    const parts = [];
    if (league) parts.push(league);
    if (time) parts.push(time);
    s.textContent = parts.length ? parts.join(" • ") : "Selected match";
  }

  // -------------------------
  // Snapshot emitter (for Right Panels + Radar)
  // -------------------------
  function buildMarketMap(seed, bias, tick) {
    const openAll = demoPrices(seed, bias, 0);
    const curAll  = demoPrices(seed, bias, tick);

    const marketMap = Object.create(null);

    for (const m of MARKETS) {
      const o = openAll[m.key] || {};
      const c = curAll[m.key] || {};
      const selMap = Object.create(null);

      for (const sel of m.cols) {
        const opening = o[sel];
        const current = c[sel];
        selMap[sel] = { opening, current };
      }
      marketMap[m.key] = selMap;
    }

    return marketMap;
  }

  function emitSnapshot() {
    if (!ACTIVE_MATCH || !ACTIVE_MATCH.id) return;
    const seed = seedFromMatch(ACTIVE_MATCH);

    const payload = {
      matchId: ACTIVE_MATCH.id,
      home: ACTIVE_MATCH.home || ACTIVE_MATCH.homeName,
      away: ACTIVE_MATCH.away || ACTIVE_MATCH.awayName,
      league: ACTIVE_MATCH.league || ACTIVE_MATCH.leagueName || "",
      updated: nowTime(),
      providers: {
        greek:   { markets: buildMarketMap(seed, GROUP_BIAS.greek, TICK) },
        eu:      { markets: buildMarketMap(seed, GROUP_BIAS.eu, TICK) },
        asian:   { markets: buildMarketMap(seed, GROUP_BIAS.asian, TICK) },
        betfair: { markets: buildMarketMap(seed, GROUP_BIAS.betfair, TICK) },
      }
    };

    if (typeof window.emit === "function") {
      window.emit("odds-snapshot", payload);
      window.emit("odds-demo:update", payload); // alias for existing listeners
    } else {
      try {
        document.dispatchEvent(new CustomEvent("odds-snapshot", { detail: payload }));
        document.dispatchEvent(new CustomEvent("odds-demo:update", { detail: payload }));
      } catch {}
    }
  }

  // -------------------------
  // Rendering
  // -------------------------
  function renderPanel(groupKey) {
    const body = el(BODY_IDS[groupKey]);
    if (!body) return;

    if (!ACTIVE_MATCH || !ACTIVE_MATCH.id) {
      body.innerHTML = `<div class="aiml-odds-wrap"><div class="aiml-empty">Select a match.</div></div>`;
      return;
    }

    const market = getMarket(ACTIVE_MARKET);
    const providers = GROUP_PROVIDERS[groupKey] || [];

    const seed = seedFromMatch(ACTIVE_MATCH);

    let rows = "";
    for (let i = 0; i < providers.length; i++) {
      const name = providers[i];
      const bias = (i + 1) * 0.17 + (groupKey.length * 0.05);

      // Opening is tick=0; Current is tick=TICK
      const open = demoPrices(seed, bias, 0);
      const cur  = demoPrices(seed, bias, TICK);

      const openMap = open[market.key] || {};
      const curMap  = cur[market.key] || {};

      let tds = `<td class="aiml-provider" title="${esc(name)}">${esc(name)}</td>`;
      for (const col of market.cols) {
        const o = openMap[col];
        const c = curMap[col];
        tds += `<td>${cell(o, c)}</td>`;
      }
      rows += `<tr>${tds}</tr>`;
    }

    body.innerHTML = `
      <div class="aiml-odds-wrap">
        <table class="aiml-odds-table">
          <thead>
            <tr>${headerCols(market)}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function renderAll() {
    ensureMarketPicker();

    // sync picker UI
    const bar = document.getElementById("active-match-bar");
    const host = bar?.querySelector(".aiml-amb-right");
    if (host && typeof host.__setActive === "function") host.__setActive(ACTIVE_MARKET);

    updateActiveMatchBarText(ACTIVE_MATCH);

    renderPanel("greek");
    renderPanel("eu");
    renderPanel("asian");
    renderPanel("betfair");
  }

  function setActiveMarket(key) {
    ACTIVE_MARKET = getMarket(key).key;
    try { localStorage.setItem(LS_MARKET, ACTIVE_MARKET); } catch {}

    renderAll();

    // notify others
    if (typeof window.emit === "function") {
      window.emit("market-selected", { key: ACTIVE_MARKET });
    } else {
      try { document.dispatchEvent(new CustomEvent("market-selected", { detail: { key: ACTIVE_MARKET } })); } catch {}
    }
  }

  function setActiveMatch(match) {
    ACTIVE_MATCH = match && (match.id || match.matchId) ? (match.id ? match : Object.assign({}, match, { id: match.matchId })) : null;
    TICK = 0;

    renderAll();
    emitSnapshot(); // wake right panels instantly
  }

  function startTicker() {
    if (TIMER) return;
    TIMER = setInterval(() => {
      if (!ACTIVE_MATCH) return;
      TICK += 1;
      renderAll();
      emitSnapshot();
    }, TICK_MS);
  }

  // -------------------------
  // Boot / Wire
  // -------------------------
  function wire() {
    // initial stored market (migrate legacy)
    let stored = null;
    try { stored = localStorage.getItem(LS_MARKET); } catch {}
    ACTIVE_MARKET = normalizeStoredMarket(stored || "1X2");
    try { localStorage.setItem(LS_MARKET, ACTIVE_MARKET); } catch {}

    // Prefer normalized for consistent time
    if (typeof window.on === "function") {
      window.on("match-selected-normalized", setActiveMatch);
      window.on("match-selected", setActiveMatch);
    } else {
      document.addEventListener("match-selected-normalized", (e) => setActiveMatch(e?.detail));
      document.addEventListener("match-selected", (e) => setActiveMatch(e?.detail));
    }

    ensureMarketPicker();
    renderAll();
    startTicker();

    // announce initial market for right modules
    if (typeof window.emit === "function") window.emit("market-selected", { key: ACTIVE_MARKET });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }

})();
