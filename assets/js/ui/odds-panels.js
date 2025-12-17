/* ============================================================
   AI MatchLab ULTRA — odds-panels.js (v2.9 final)
   Center Odds Panels with clean O→C visuals
   Market dropdown top-right of Active Match Bar
============================================================ */
(function () {
  "use strict";
  if (window.__AIML_ODDS_PANELS_V9_FINAL__) return;
  window.__AIML_ODDS_PANELS_V9_FINAL__ = true;

  const BODY_IDS = {
    greek: "greek-odds-body",
    eu: "eu-odds-body",
    asian: "asian-odds-body",
    betfair: "betfair-odds-body",
  };

  const GROUP_PROVIDERS = {
    greek: ["Bet365", "Stoiximan", "OPAP"],
    eu: ["Unibet", "Bwin", "Ladbrokes"],
    asian: ["Pinnacle", "SBOBET", "188BET", "12BET"],
    betfair: ["Betfair Exchange", "Betfair Sportsbook"],
  };

  const MARKETS = [
    { key: "1X2", label: "1X2", cols: ["1", "X", "2"] },
    { key: "DC", label: "DC", cols: ["1X", "12", "X2"] },
    { key: "GG", label: "GG/NG", cols: ["Yes", "No"] },
    { key: "OU15", label: "O/U 1.5", cols: ["Over 1.5", "Under 1.5"] },
    { key: "OU25", label: "O/U 2.5", cols: ["Over 2.5", "Under 2.5"] },
    { key: "OU35", label: "O/U 3.5", cols: ["Over 3.5", "Under 3.5"] },
  ];

  const TICK_MS = 2500;
  let ACTIVE_MATCH = null;
  let ACTIVE_MARKET = localStorage.getItem("AIML_ACTIVE_MARKET") || "1X2";
  let TICK = 0;
  let TIMER = null;

  const el = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  function clamp(x, a, b) {
    return Math.max(a, Math.min(b, x));
  }

  function seedFromMatch(m) {
    const s = `${m?.id || ""}|${m?.home || ""}|${m?.away || ""}`;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000;
  }

  function fmt(x) {
    return Number.isFinite(x) ? x.toFixed(2) : "—";
  }

  function demoPrices(seed, bias, tick, marketKey) {
    const drift = (Math.sin(seed * 20 + bias * 5 + tick * 0.6) + 1) * 0.5;
    const favBias = (seed - 0.5) * 0.7;
    const factor = 1 + (drift - 0.5) * 0.14;

    const baseHome = clamp(2.10 - favBias * 0.8, 1.45, 3.50);
    const baseAway = clamp(2.30 + favBias * 0.9, 1.55, 4.20);
    const baseDraw = clamp(
      3.20 + (0.5 - Math.abs(seed - 0.5)) * 0.8,
      2.60,
      4.20
    );

    const home = clamp(baseHome * factor, 1.40, 4.00);
    const away = clamp(baseAway / factor, 1.40, 4.50);
    const draw = clamp(baseDraw * (1 + Math.sin(tick * 0.4) * 0.05), 2.4, 4.5);

    const ou15 = {
      "Over 1.5": clamp(1.70 * factor, 1.45, 2.10),
      "Under 1.5": clamp(2.10 / factor, 1.60, 2.40),
    };
    const ou25 = {
      "Over 2.5": clamp(1.90 * factor, 1.55, 2.30),
      "Under 2.5": clamp(1.90 / factor, 1.55, 2.30),
    };
    const ou35 = {
      "Over 3.5": clamp(2.30 * factor, 1.80, 3.00),
      "Under 3.5": clamp(1.60 / factor, 1.40, 2.10),
    };
    const gg = {
      Yes: clamp(1.80 * factor, 1.50, 2.30),
      No: clamp(1.95 / factor, 1.50, 2.40),
    };
    const dc = {
      "1X": clamp(1.35 * factor, 1.20, 1.60),
      "12": clamp(1.35 / factor, 1.20, 1.60),
      "X2": clamp(1.40 * factor, 1.25, 1.70),
    };

    return (
      {
        "1X2": { "1": home, X: draw, "2": away },
        DC: dc,
        GG: gg,
        OU15: ou15,
        OU25: ou25,
        OU35: ou35,
      }[marketKey] || { "1": home, X: draw, "2": away }
    );
  }

  function cell(o, c) {
    const diff = c - o;
    const color = diff < 0 ? "pos" : diff > 0 ? "neg" : "neutral";
    return `
      <span class="oc-chip ${color}">
        <span class="oc-o">${fmt(o)}</span>
        <span class="oc-arrow">→</span>
        <span class="oc-c">${fmt(c)}</span>
      </span>`;
  }

  function renderPanel(groupKey) {
    const body = el(BODY_IDS[groupKey]);
    if (!body) return;
    if (!ACTIVE_MATCH) {
      body.innerHTML = `<div class="aiml-empty">Select a match</div>`;
      return;
    }

    const seed = seedFromMatch(ACTIVE_MATCH);
    const market = MARKETS.find((m) => m.key === ACTIVE_MARKET) || MARKETS[0];
    const providers = GROUP_PROVIDERS[groupKey] || [];

    let html = `<table class="aiml-odds"><tbody>`;
    providers.forEach((p, i) => {
      const bias = (i + 1) * 0.2;
      const open = demoPrices(seed, bias, 0, market.key);
      const cur = demoPrices(seed, bias, TICK, market.key);
      html += `<tr><td class="prov">${esc(p)}</td>`;
      market.cols.forEach((k) => {
        html += `<td>${cell(open[k], cur[k])}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table>`;
    body.innerHTML = html;
  }

  function renderAll() {
    ["greek", "eu", "asian", "betfair"].forEach(renderPanel);
  }

  function updateActiveMatchBar(m) {
    const bar = document.getElementById("active-match-bar");
    if (!bar) return;
    const titleEl = bar.querySelector(".amb-title");
    const subEl = bar.querySelector(".amb-sub");
    if (!titleEl || !subEl) return;

    if (!m) {
      titleEl.textContent = "No match selected";
      subEl.textContent = "";
      return;
    }
    const home = m.home || m.homeName || m.team_home || "Home";
    const away = m.away || m.awayName || m.team_away || "Away";
    titleEl.textContent = `${home} vs ${away}`;
    const info = [m.country || "", m.league || "", m.time || ""]
      .filter(Boolean)
      .join(" • ");
    subEl.textContent = info || "";
  }

  // ---- MARKET SELECTOR ----
  function ensureMarketSelector() {
    const bar = document.getElementById("active-match-bar");
    if (!bar) return null;
    let sel = document.getElementById("market-selector");
    if (sel) return sel;

    const wrap = document.createElement("div");
    wrap.className = "amb-market-right";
    wrap.innerHTML = `
      <select id="market-selector" class="amb-market-select" aria-label="Market selector"></select>
    `;
    bar.appendChild(wrap);

    if (!document.getElementById("aiml-market-style")) {
      const st = document.createElement("style");
      st.id = "aiml-market-style";
      st.textContent = `
        #active-match-bar{ position:relative; }
        .amb-market-right{
          position:absolute;
          top:6px;
          right:10px;
        }
        .amb-market-select{
          appearance:none;
          padding:4px 10px;
          border-radius:8px;
          border:1px solid rgba(255,255,255,.15);
          background-color:rgba(0,0,0,.35);
          color:#fff;
          font-size:13px;
        }
        .amb-market-select option{
          background-color:#1b1e22;
          color:#fff;
        }
        html[data-theme="light"] .amb-market-select{
          background-color:#f5f5f5;
          color:#000;
          border-color:rgba(0,0,0,.2);
        }
        html[data-theme="light"] .amb-market-select option{
          background-color:#fff;
          color:#000;
        }
      `;
      document.head.appendChild(st);
    }
    return document.getElementById("market-selector");
  }

  function setActiveMarket(key, emit) {
    const exists = MARKETS.some((m) => m.key === key);
    ACTIVE_MARKET = exists ? key : "1X2";
    localStorage.setItem("AIML_ACTIVE_MARKET", ACTIVE_MARKET);
    const sel = document.getElementById("market-selector");
    if (sel && sel.value !== ACTIVE_MARKET) sel.value = ACTIVE_MARKET;
    if (emit && window.emit) window.emit("market-selected", ACTIVE_MARKET);
    renderAll();
  }

  function initMarketSelector() {
    const sel = ensureMarketSelector();
    if (!sel) return;
    sel.innerHTML = MARKETS.map(
      (m) =>
        `<option value="${m.key}" ${
          m.key === ACTIVE_MARKET ? "selected" : ""
        }>${m.label}</option>`
    ).join("");

    if (sel.dataset.bound === "1") {
      sel.value = ACTIVE_MARKET;
      return;
    }
    sel.dataset.bound = "1";
    sel.addEventListener("change", () => setActiveMarket(sel.value, true));

    window.on?.("market-selected", (k) => {
      if (k && k !== ACTIVE_MARKET) setActiveMarket(k, false);
    });

    setTimeout(() => window.emit?.("market-selected", ACTIVE_MARKET), 50);
  }

  function setActiveMatch(m) {
    ACTIVE_MATCH = m || null;
    TICK = 0;
    updateActiveMatchBar(ACTIVE_MATCH);
    renderAll();
  }

  function tickLoop() {
    if (TIMER) return;
    TIMER = setInterval(() => {
      if (!ACTIVE_MATCH) return;
      TICK++;
      renderAll();
    }, TICK_MS);
  }

  function wire() {
    window.on?.("match-selected", setActiveMatch);
    updateActiveMatchBar(null);
    initMarketSelector();
    renderAll();
    tickLoop();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
