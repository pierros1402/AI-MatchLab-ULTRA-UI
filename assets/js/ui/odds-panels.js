/* ============================================================
   AI MatchLab ULTRA — odds-panels.js (UNIFIED MARKET TAB + NO DUPLICATES)
   - One Market tab (dropdown) in Active Match Bar
   - Auto close on selection
   - Default market: 1X2
   - Removes per-panel duplicate match title + "Market/Updated" lines
   - Panels render ONLY the odds table (providers vertical, odds horizontal)
   - Uses match-selected-normalized if available (time consistency)
   - No imports/exports (global script)
============================================================ */

(function () {
  "use strict";
  if (window.__AIML_ODDS_PANELS_V3__) return;
  window.__AIML_ODDS_PANELS_V3__ = true;

  // -------- Panel body IDs (stable) --------
  const BODY_IDS = {
    greek: "greek-odds-body",
    eu: "eu-odds-body",
    asian: "asian-odds-body",
    betfair: "betfair-odds-body",
  };

  // -------- Markets (main bookmaker markets) --------
  const MARKETS = [
    { key: "h2h", label: "1X2", cols: ["1", "X", "2"] },
    { key: "dc", label: "Double Chance", cols: ["1X", "12", "X2"] },
    { key: "ou25", label: "O/U 2.5", cols: ["Over 2.5", "Under 2.5"] },
    { key: "btts", label: "BTTS", cols: ["Yes", "No"] },
    { key: "dnb", label: "Draw No Bet", cols: ["1 (DNB)", "2 (DNB)"] },
    { key: "ah0", label: "Asian Handicap 0.0", cols: ["1 (0.0)", "2 (0.0)"] },
  ];

  const LS_MARKET = "aiml_market_key_v3";

  // -------- Helpers --------
  const el = (id) => document.getElementById(id);

  function esc(s) {
    return String(s ?? "")
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

  function getMarket(key) {
    return MARKETS.find((m) => m.key === key) || MARKETS[0];
  }

  function clamp(x, a, b) {
    return Math.max(a, Math.min(b, x));
  }

  function seedFromMatch(match) {
    const s = `${match?.id || ""}|${match?.home || ""}|${match?.away || ""}`;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000;
  }

  function injectStylesOnce() {
    if (document.getElementById("aiml-odds-panels-v3-style")) return;
    const st = document.createElement("style");
    st.id = "aiml-odds-panels-v3-style";
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
      }
      .aiml-market-btn:hover{ background: rgba(255,255,255,0.12); }
      .aiml-market-menu{
        position:absolute; right:0; top:44px;
        width: 220px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(0,0,0,0.78);
        backdrop-filter: blur(10px);
        padding: 8px;
        display:none;
        z-index: 999;
      }
      .aiml-market-menu.open{ display:block; }
      .aiml-market-item{
        padding: 10px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.10);
        background: rgba(255,255,255,0.06);
        cursor:pointer;
        font-size: 12px;
        font-weight: 900;
        margin-bottom: 6px;
      }
      .aiml-market-item:last-child{ margin-bottom:0; }
      .aiml-market-item:hover{ background: rgba(255,255,255,0.10); }
      .aiml-market-item.active{ outline: 2px solid rgba(255,255,255,0.22); }

      /* Table rendering (neutral; keeps your theme) */
      .aiml-odds-wrap{ display:block; }
      .aiml-odds-table{
        width:100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      .aiml-odds-table th, .aiml-odds-table td{
        padding: 10px 10px;
        border-top: 1px solid rgba(255,255,255,0.08);
        vertical-align: middle;
      }
      .aiml-odds-table thead th{
        position: sticky;
        top: 0;
        background: rgba(0,0,0,0.25);
        backdrop-filter: blur(6px);
        z-index: 1;
        border-top: none;
        font-size: 11px;
        opacity: .9;
      }
      .aiml-provider{
        font-weight: 900;
        white-space: nowrap;
      }
      .aiml-cell{
        display:flex;
        align-items:center;
        justify-content: space-between;
        gap: 10px;
        white-space: nowrap;
      }
      .aiml-open{ opacity:.75; font-weight:700; }
      .aiml-cur{ font-weight: 1000; }
      .aiml-arrow{ opacity:.85; font-weight: 1000; }
      .aiml-empty{ opacity:.75; padding: 10px 6px; }
    `;
    document.head.appendChild(st);
  }

  // -------- Demo snapshot generator (fallback) --------
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

    // tick modifies "current"
    const k = 0.06 * (drift - 0.5);

    return {
      h2h: { "1": home, "X": draw, "2": away, curK: k },
      dc: { "1X": clamp(1.35 + 0.05 * drift, 1.20, 1.55), "12": clamp(1.28 + 0.06 * drift, 1.12, 1.55), "X2": clamp(1.40 + 0.05 * drift, 1.20, 1.65), curK: k },
      ou25: { "Over 2.5": over, "Under 2.5": under, curK: k },
      btts: { "Yes": bttsYes, "No": bttsNo, curK: k },
      dnb: { "1 (DNB)": clamp(home - 0.18, 1.25, 3.10), "2 (DNB)": clamp(away - 0.18, 1.25, 3.60), curK: k },
      ah0: { "1 (0.0)": clamp(1.90 - favBias * 0.25, 1.55, 2.35), "2 (0.0)": clamp(1.90 + favBias * 0.25, 1.55, 2.35), curK: k },
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
    for (const c of market.cols) {
      th += `<th style="text-align:left;">${esc(c)} (O/C)</th>`;
    }
    return th;
  }

  // -------- Unified Market UI in Active Match Bar --------
  function ensureMarketPicker() {
    injectStylesOnce();

    const bar = document.getElementById("active-match-bar");
    if (!bar) return;

    // Ensure bar has a left/right row wrapper (without breaking existing)
    let row = bar.querySelector(".aiml-amb-row");
    if (!row) {
      const title = bar.querySelector(".amb-title");
      const sub = bar.querySelector(".amb-sub");

      const left = document.createElement("div");
      left.className = "aiml-amb-left";
      if (title) left.appendChild(title);
      if (sub) left.appendChild(sub);

      const right = document.createElement("div");
      right.className = "aiml-amb-right";

      row = document.createElement("div");
      row.className = "aiml-amb-row";
      row.appendChild(left);
      row.appendChild(right);

      // Clear bar and re-attach
      bar.innerHTML = "";
      bar.appendChild(row);
    }

    const host = row.querySelector(".aiml-amb-right");
    if (!host || host.__aiml_market_inited) return;
    host.__aiml_market_inited = true;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "aiml-market-btn";
    btn.id = "aiml-market-btn";

    const menu = document.createElement("div");
    menu.className = "aiml-market-menu";
    menu.id = "aiml-market-menu";

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
        item.addEventListener("click", () => {
          setActiveMarket(it.key);
          menu.classList.remove("open"); // auto close
        });
        menu.appendChild(item);
      }
    };
  }

  // -------- Runtime state --------
  let ACTIVE_MATCH = null;
  let ACTIVE_MARKET = getMarket(localStorage.getItem(LS_MARKET) || "h2h").key;
  let TICK = 0;
  let TIMER = null;

  // Providers by group (vertical)
  const GROUP_PROVIDERS = {
    greek: ["Bet365", "Stoiximan", "OPAP"],
    eu: ["William Hill", "Ladbrokes", "Unibet", "Bwin"],
    asian: ["Pinnacle", "SBO", "188BET", "12BET", "MaxBet"],
    betfair: ["Betfair Exchange", "Betfair SP"],
  };

  function updateActiveMatchBarText(match) {
    const bar = document.getElementById("active-match-bar");
    if (!bar) return;

    const title = bar.querySelector(".amb-title");
    const sub = bar.querySelector(".amb-sub");

    if (!match) {
      if (title) title.textContent = "No match selected";
      if (sub) sub.textContent = "Select a match from the left panel.";
      return;
    }

    const league = match.leagueName || match.league || "";
    const time = match.displayTime || match.kickoff || match.time || "";
    const m = getMarket(ACTIVE_MARKET);
    const updated = nowTime();

    if (title) title.textContent = `${match.home} vs ${match.away}`;
    if (sub) {
      const parts = [];
      if (league) parts.push(league);
      if (time) parts.push(time);
      parts.push(`Market: ${m.label}`);
      parts.push(`Updated: ${updated}`);
      sub.textContent = parts.join(" • ");
    }
  }

  function renderPanel(groupKey) {
    const body = el(BODY_IDS[groupKey]);
    if (!body) return;

    if (!ACTIVE_MATCH || !ACTIVE_MATCH.id) {
      body.innerHTML = `<div class="aiml-odds-wrap"><div class="aiml-empty">Select a match.</div></div>`;
      return;
    }

    const market = getMarket(ACTIVE_MARKET);
    const providers = GROUP_PROVIDERS[groupKey] || [];

    // If later you feed real odds, hook it here. For now we generate stable demo.
    const seed = seedFromMatch(ACTIVE_MATCH);

    let rows = "";
    for (let i = 0; i < providers.length; i++) {
      const name = providers[i];
      const bias = (i + 1) * 0.17 + (groupKey.length * 0.05);

      // Opening is tick=0; Current is tick=TICK
      const open = demoPrices(seed, bias, 0);
      const cur = demoPrices(seed, bias, TICK);

      const openMap = open[market.key] || {};
      const curMap = cur[market.key] || {};

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
          <thead><tr>${headerCols(market)}</tr></thead>
          <tbody>
            ${rows || `<tr><td colspan="8" style="opacity:.75;">No data.</td></tr>`}
          </tbody>
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
    ACTIVE_MATCH = match && match.id ? match : null;
    TICK = 0;
    renderAll();
  }

  function startTicker() {
    if (TIMER) return;
    TIMER = setInterval(() => {
      if (!ACTIVE_MATCH) return;
      TICK++;
      // update only market/time line + tables
      updateActiveMatchBarText(ACTIVE_MATCH);
      renderPanel("greek");
      renderPanel("eu");
      renderPanel("asian");
      renderPanel("betfair");
    }, 2500);
  }

  // -------- Event wiring --------
  function wire() {
    // Prefer normalized for consistent time
    if (typeof window.on === "function") {
      window.on("match-selected-normalized", setActiveMatch);
      window.on("match-selected", setActiveMatch);
    } else {
      document.addEventListener("match-selected-normalized", (e) => setActiveMatch(e?.detail));
      document.addEventListener("match-selected", (e) => setActiveMatch(e?.detail));
    }

    // initial market button render
    ensureMarketPicker();
    // apply stored market label
    renderAll();
    startTicker();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
