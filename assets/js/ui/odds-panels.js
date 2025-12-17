/* ============================================================
   AI MatchLab ULTRA — odds-panels.js
   Center Odds Panels with clean O→C visuals (no O:/C: labels)
   Live demo drift for UI testing
============================================================ */

(function () {
  "use strict";
  if (window.__AIML_ODDS_PANELS_V5_CLEAN__) return;
  window.__AIML_ODDS_PANELS_V5_CLEAN__ = true;

  const BODY_IDS = {
    greek: "greek-odds-body",
    eu: "eu-odds-body",
    asian: "asian-odds-body",
    betfair: "betfair-odds-body",
  };

  const GROUP_PROVIDERS = {
    greek: ["Bet365", "Stoiximan", "OPAP"],
    eu: ["William Hill", "Ladbrokes", "Unibet", "Bwin"],
    asian: ["Pinnacle", "SBO", "188BET", "12BET"],
    betfair: ["Betfair Exchange", "Betfair SP"],
  };

  const MARKETS = [
    { key: "1X2", label: "1X2", cols: ["1", "X", "2"] },
    { key: "OU25", label: "O/U 2.5", cols: ["Over 2.5", "Under 2.5"] },
  ];

  const TICK_MS = 2500;
  let ACTIVE_MATCH = null;
  let ACTIVE_MARKET = "1X2";
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

  // ---------- Active Match Bar (title/subtitle) ----------
  function updateActiveMatchBar(m) {
    const bar = document.getElementById("active-match-bar");
    if (!bar) return;

    // Support both class-based and id-based markup
    const titleEl =
      bar.querySelector(".amb-title") || document.getElementById("amb-title");
    const subEl =
      bar.querySelector(".amb-sub") || document.getElementById("amb-sub");

    if (!titleEl || !subEl) return;

    if (!m) {
      titleEl.textContent = "No match selected";
      subEl.textContent = "Select a match from the left panel.";
      return;
    }

    const home = m.home || m.homeName || m.team_home || "Home";
    const away = m.away || m.awayName || m.team_away || "Away";

    const country = m.country || m.countryName || "";
    const league = m.leagueName || m.league || "";
    const time =
      m.displayTime || m.kickoff || m.time || m.startTime || m.date || "";

    titleEl.textContent = `${home} vs ${away}`;

    const parts = [];
    if (country) parts.push(country);
    if (league) parts.push(league);
    if (time) parts.push(time);

    subEl.textContent = parts.length ? parts.join(" • ") : "Selected match";
  }

  // ---------- DRIFT DEMO ----------
  function demoPrices(seed, bias, tick) {
    const drift = (Math.sin(seed * 20 + bias * 5 + tick * 0.6) + 1) * 0.5;
    const favBias = (seed - 0.5) * 0.7;

    const baseHome = clamp(2.10 - favBias * 0.8, 1.45, 3.50);
    const baseAway = clamp(2.30 + favBias * 0.9, 1.55, 4.20);
    const baseDraw = clamp(
      3.20 + (0.5 - Math.abs(seed - 0.5)) * 0.8,
      2.60,
      4.20
    );

    const factor = 1 + (drift - 0.5) * 0.14;

    const home = clamp(baseHome * factor, 1.40, 4.00);
    const away = clamp(baseAway / factor, 1.40, 4.50);
    const draw = clamp(baseDraw * (1 + Math.sin(tick * 0.4) * 0.05), 2.4, 4.5);

    const over = clamp(1.90 * factor, 1.60, 2.30);
    const under = clamp(1.90 / factor, 1.60, 2.30);

    return {
      "1X2": { "1": home, "X": draw, "2": away },
      "OU25": { "Over 2.5": over, "Under 2.5": under },
    };
  }

  // ---------- helpers for color chip ----------
  function ocAttrs(o, c) {
    const d = c - o;
    const abs = Math.abs(d);
    const sign = d >= 0 ? "pos" : "neg";
    const intense = abs >= 0.20 ? "true" : "false";
    const critical = abs >= 0.40 ? "true" : "false";
    return `data-delta="${d.toFixed(
      2
    )}" data-sign="${sign}" data-intense="${intense}" data-critical="${critical}"`;
  }

  function cell(o, c) {
    const diff = c - o;
    return `
      <span class="oc-chip" ${ocAttrs(o, c)}>
        <span class="oc-o">${fmt(o)}</span>
        <span class="oc-arrow">→</span>
        <span class="oc-c">${fmt(c)}</span>
        <span class="oc-delta">Δ ${(diff >= 0 ? "+" : "") + diff.toFixed(
          2
        )}</span>
      </span>`;
  }

  // ---------- rendering ----------
  function renderPanel(groupKey) {
    const body = el(`${groupKey}-odds-body`);
    if (!body) return;

    if (!ACTIVE_MATCH) {
      body.innerHTML = `<div class="aiml-empty">Select a match.</div>`;
      return;
    }

    const seed = seedFromMatch(ACTIVE_MATCH);
    const market = MARKETS.find((m) => m.key === ACTIVE_MARKET) || MARKETS[0];
    const providers = GROUP_PROVIDERS[groupKey] || [];

    let html = `<table class="aiml-odds-table"><tbody>`;
    for (let i = 0; i < providers.length; i++) {
      const bias = (i + 1) * 0.2;
      const open = demoPrices(seed, bias, 0)[market.key];
      const cur = demoPrices(seed, bias, TICK)[market.key];

      html += `<tr><td class="aiml-provider">${esc(providers[i])}</td>`;
      for (const col of market.cols) {
        html += `<td>${cell(open[col], cur[col])}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table>`;
    body.innerHTML = html;
  }

  function renderAll() {
    ["greek", "eu", "asian", "betfair"].forEach(renderPanel);
  }

  function setActiveMatch(m) {
    ACTIVE_MATCH = m || null;
    TICK = 0;

    // Update center header (match title/subtitle)
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
    if (typeof window.on === "function") {
      window.on("match-selected", setActiveMatch);
    }

    // Ensure header shows correct state on load
    updateActiveMatchBar(null);

    renderAll();
    tickLoop();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
