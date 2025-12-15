// ====================================================================
// ODDS ENGINE — CENTER PANEL (COMPLETE)
// ====================================================================
//
// - Δέχεται odds από event "odds-loaded"
// - Δουλεύει με Match Hub
// - Εμφανίζει 1X2, Over/Under, Asian Handicap
//
// ====================================================================

const panel = document.getElementById("panel-odds");

if (!panel) {
  console.warn("[ODDS] panel-odds not found");
}

let softOdds = null;


// ====================================================================
// LISTEN TO ODDS LOADING FROM WORKER/HUB
// ====================================================================
on("odds-loaded", data => {
  softOdds = data.odds;
  renderOdds();
});


// ====================================================================
// MATCH SELECTED → clear panel
// ====================================================================
on("match-selected", () => {
  panel.innerHTML = `<div class="loading">Loading odds...</div>`;
});


// ====================================================================
// RENDER ODDS PANEL
// ====================================================================
function renderOdds() {
  if (!softOdds) {
    panel.innerHTML = `<div class="empty-panel">No odds available</div>`;
    return;
  }

  const bm = softOdds.bookmakers?.[0];
  if (!bm) {
    panel.innerHTML = `<div class="empty-panel">No bookmaker data</div>`;
    return;
  }

  let html = `<div class="odds-title">Odds</div>`;

  // ------------------------------------------------------------
  // RENDER MARKETS
  // ------------------------------------------------------------
  const markets = bm.markets || [];

  markets.forEach(m => {
    if (m.key === "h2h") {
      html += render1X2(m);
    }
    if (m.key === "over_under") {
      html += renderOU(m);
    }
    if (m.key === "asian_handicap") {
      html += renderAH(m);
    }
  });

  panel.innerHTML = html;
}



// ====================================================================
// 1X2 MARKET
// ====================================================================
function render1X2(m) {
  const o = m.outcomes;

  return `
    <div class="odds-box">
      <div class="odds-header">1X2</div>
      <div class="odds-row">
        <div class="odds-col">Home<br><b>${o[0].price}</b></div>
        <div class="odds-col">Draw<br><b>${o[1].price}</b></div>
        <div class="odds-col">Away<br><b>${o[2].price}</b></div>
      </div>
    </div>
  `;
}



// ====================================================================
// OVER / UNDER MARKET
// ====================================================================
function renderOU(m) {
  return `
    <div class="odds-box">
      <div class="odds-header">Over / Under (${m.over_under})</div>
      <div class="odds-row">
        <div class="odds-col">Over<br><b>${m.over_price}</b></div>
        <div class="odds-col">Under<br><b>${m.under_price}</b></div>
      </div>
    </div>
  `;
}



// ====================================================================
// ASIAN HANDICAP MARKET
// ====================================================================
function renderAH(m) {
  return `
    <div class="odds-box">
      <div class="odds-header">Asian Handicap (${m.handicap})</div>
      <div class="odds-row">
        <div class="odds-col">Home<br><b>${m.home_price}</b></div>
        <div class="odds-col">Away<br<br><b>${m.away_price}</b></div>
      </div>
    </div>
  `;
}
