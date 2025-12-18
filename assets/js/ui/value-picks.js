/* =========================================================
   AI MatchLab ULTRA — Value Picks v2.9.3
   Market-aware demo dataset + live sync
======================================================== */
(function () {
  "use strict";

  const elList   = document.getElementById("value-picks-list");
  const elMeta   = document.getElementById("value-picks-meta");
  const elHeader = document.getElementById("value-picks-header");

  const state = { activeMarket: "1X2", values: [] };

  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // --------------------------------------------------------
  // Demo data per market
  // --------------------------------------------------------
  const DEMO_BY_MARKET = {
    "1X2": [
      { match: "Barcelona vs Betis", edge: 10.2, label: "AI vs Market" },
      { match: "Panathinaikos vs AEK", edge: 7.4, label: "Late drift" }
    ],
    "DC": [
      { match: "Lazio vs Inter", edge: 5.6, label: "Safer combination" },
      { match: "PSV vs Feyenoord", edge: 4.1, label: "Balanced DC" }
    ],
    "GG": [
      { match: "Union Berlin vs Mainz", edge: 9.8, label: "Likely goals" },
      { match: "Marseille vs Nice", edge: 6.5, label: "BTTS pressure" }
    ],
    "OU15": [
      { match: "Empoli vs Udinese", edge: 8.0, label: "Under edge" },
      { match: "Bologna vs Torino", edge: 4.9, label: "Tight game" }
    ],
    "OU25": [
      { match: "Liverpool vs Brighton", edge: 11.1, label: "Over edge" },
      { match: "Villarreal vs Granada", edge: 6.7, label: "Market lag" }
    ],
    "OU35": [
      { match: "Man Utd vs Leeds", edge: 9.9, label: "High variance" },
      { match: "Real Sociedad vs Celta", edge: 5.5, label: "Late movement" }
    ]
  };

  function buildDemo() {
    state.values =
      (DEMO_BY_MARKET[state.activeMarket] || DEMO_BY_MARKET["1X2"]).map((v) => ({
        ...v,
        _market: state.activeMarket,
      }));
  }

  function render() {
    if (!elList) return;

    if (!state.values.length) {
      elList.innerHTML = `<div class="right-empty">No ${esc(
        state.activeMarket
      )} value edges.</div>`;
      elMeta.textContent = "AI vs Market";
      return;
    }

    elList.innerHTML = state.values
      .map(
        (v) => `
      <div class="right-item">
        <div class="right-main"><strong>${esc(v.match)}</strong></div>
        <div class="right-sub">Edge ${Number(v.edge).toFixed(1)}% · ${esc(
          v.label
        )}</div>
      </div>`
      )
      .join("");

    elMeta.textContent = `AI vs Market · ${state.values.length}`;
  }

  // --------------------------------------------------------
  // Market sync
  // --------------------------------------------------------
  window.on("value-picks:market-update", (mkt) => {
    state.activeMarket = mkt;
    if (elHeader) elHeader.textContent = `Value Picks • ${mkt}`;
    buildDemo();
    render();
  });

  // initial render
  buildDemo();
  render();
})();
