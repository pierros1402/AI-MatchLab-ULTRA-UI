// ======================================================================
// TOP PICKS PANEL 2.0 — AI VALUE DETECTION ENGINE
// ======================================================================
//
// Input:
//    - Market implied probabilities (from odds-engine.js)
//    - Model probabilities (from Match Hub)
//
// Output:
//    - Ranked list of value picks
//    - Color-coded strength
// ======================================================================

const topPicksPanel = document.getElementById("panel-top-picks");

let hubCache = null;
let lastTopPicks = [];


// Listen for hub (model probabilities)
on("hub-updated", data => {
  hubCache = data;
});


// Listen for odds engine signals
on("top-picks-update", unified => {
  if (!hubCache) return;

  const picks = computeTopPicks(unified, hubCache);
  lastTopPicks = picks;
  renderTopPicks(picks);
});


// ----------------------------------------------------------------------
// VALUE CALCULATION
// ----------------------------------------------------------------------
function computeTopPicks(odds, hub) {
  const model = hub.probabilities;

  const selections = ["home", "draw", "away"];
  const names = {
    home: hub.match.teams.home.name,
    draw: "Draw",
    away: hub.match.teams.away.name
  };

  const output = [];

  Object.entries(odds).forEach(([book, line]) => {
    if (!line || !line.implied) return;

    selections.forEach(sel => {
      const modelP = Number(model[sel]);
      const marketP = Number(line.implied[sel]);

      if (!modelP || !marketP) return;

      const value = modelP - marketP; // positive = good
      const valuePct = Math.round(value * 100);

      output.push({
        bookmaker: book,
        selection: sel,
        team: names[sel],
        modelP,
        marketP,
        value,
        valuePct,
        odd: line[sel]
      });
    });
  });

  // Keep only positive opportunities
  const filtered = output.filter(x => x.valuePct >= 5);

  // Sort by value percentage
  return filtered.sort((a, b) => b.valuePct - a.valuePct);
}


// ----------------------------------------------------------------------
// RENDER PANEL
// ----------------------------------------------------------------------
function renderTopPicks(list) {
  if (!topPicksPanel) return;

  if (!list || list.length === 0) {
    topPicksPanel.innerHTML = `<div class="empty-panel">No value picks at the moment</div>`;
    return;
  }

  let html = `<div class="tp-title">Value Opportunities</div>`;

  list.forEach(item => {
    const color = item.valuePct > 15
      ? "tp-strong"
      : item.valuePct > 8
      ? "tp-medium"
      : "tp-weak";

    html += `
      <div class="tp-item ${color}">
        <div class="tp-header">
          <span class="tp-team">${item.team}</span>
          <span class="tp-book">${item.bookmaker}</span>
        </div>

        <div class="tp-vals">
          <span>Odd: <b>${item.odd.toFixed(2)}</b></span>
          <span>Value: <b>${item.valuePct}%</b></span>
        </div>

        <div class="tp-sub">
          Model: ${(item.modelP * 100).toFixed(1)}% | 
          Market: ${(item.marketP * 100).toFixed(1)}%
        </div>
      </div>
    `;
  });

  topPicksPanel.innerHTML = html;
}
