/* =========================================================
   AI MatchLab ULTRA — Top Picks v2.9.3
   Market-aware demo dataset + live sync
======================================================== */
(function () {
  "use strict";

  const elList   = document.getElementById("picks-list");
  const elMeta   = document.getElementById("picks-meta");
  const elHeader = document.getElementById("top-picks-header");

  const state = { activeMarket: "1X2", picks: [] };

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
      { match: "Barcelona vs Sevilla", form: 9.1, motivation: "High", rank: 1 },
      { match: "Man City vs Arsenal", form: 8.8, motivation: "Medium", rank: 2 },
      { match: "PAOK vs Olympiacos", form: 7.4, motivation: "High", rank: 3 }
    ],
    "DC": [
      { match: "Juventus vs Milan", form: 8.2, motivation: "High", rank: 1 },
      { match: "Benfica vs Porto", form: 7.9, motivation: "Medium", rank: 2 }
    ],
    "GG": [
      { match: "PSG vs Monaco", form: 9.0, motivation: "High", rank: 1 },
      { match: "Dortmund vs Leipzig", form: 8.7, motivation: "Medium", rank: 2 }
    ],
    "OU15": [
      { match: "Roma vs Napoli", form: 7.5, motivation: "High", rank: 1 },
      { match: "Ajax vs AZ", form: 7.0, motivation: "Low", rank: 2 }
    ],
    "OU25": [
      { match: "Liverpool vs Chelsea", form: 8.8, motivation: "High", rank: 1 },
      { match: "Real Madrid vs Valencia", form: 8.2, motivation: "Medium", rank: 2 }
    ],
    "OU35": [
      { match: "Tottenham vs Newcastle", form: 8.1, motivation: "High", rank: 1 },
      { match: "Atalanta vs Fiorentina", form: 7.6, motivation: "Medium", rank: 2 }
    ]
  };

  function buildDemo() {
    state.picks =
      (DEMO_BY_MARKET[state.activeMarket] || DEMO_BY_MARKET["1X2"]).map((p) => ({
        ...p,
        _market: state.activeMarket,
      }));
  }

  function render() {
    if (!elList) return;
    if (!state.picks.length) {
      elList.innerHTML = `<div class="right-empty">No Top Picks for ${esc(
        state.activeMarket
      )}.</div>`;
      elMeta.textContent = "AI Stats";
      return;
    }
    elList.innerHTML = state.picks
      .map(
        (p) => `
      <div class="right-item">
        <div class="right-main"><strong>${esc(p.match)}</strong></div>
        <div class="right-sub">Form ${p.form.toFixed(
          1
        )} · ${p.motivation} · AI Rank #${p.rank}</div>
      </div>`
      )
      .join("");
    elMeta.textContent = `AI Stats · ${state.picks.length}`;
  }

  // --------------------------------------------------------
  // Market sync
  // --------------------------------------------------------
  window.on("top-picks:market-update", (mkt) => {
    state.activeMarket = mkt;
    if (elHeader) elHeader.textContent = `Top Picks • ${mkt}`;
    buildDemo();
    render();
  });

  // initial render
  buildDemo();
  render();
})();
