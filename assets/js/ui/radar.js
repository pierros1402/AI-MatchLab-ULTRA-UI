// ====================================================================
// MARKET RADAR PANEL — Complete Odds Movement Monitor
// ====================================================================
//
// Λειτουργία:
// - Παρακολουθεί αλλαγές αποδόσεων 1X2 / O-U / AH
// - Παράγει alerts: DROP, RISE, SHOCK
// - Δημιουργεί Shock Index (0–100)
// - Δουλεύει με odds-loaded event
//
// ====================================================================

const radarPanel = document.getElementById("panel-radar");
if (!radadarPanel) console.warn("[RADAR] panel-radar missing");

let lastOdds = null;
let history = [];

// --------------------------------------------------------------------
// LISTEN FOR ODDS UPDATES
// --------------------------------------------------------------------
on("odds-loaded", data => {
  const newOdds = extractCoreOdds(data.odds);
  processUpdates(newOdds);
  renderRadar();
});


// ====================================================================
// Extract only key markets (Home, Draw, Away)
// ====================================================================
function extractCoreOdds(oddsData) {
  if (!oddsData || !oddsData.bookmakers) return null;

  const bm = oddsData.bookmakers[0];
  const markets = bm.markets || [];

  const h2h = markets.find(m => m.key === "h2h");

  if (!h2h) return null;

  return {
    home: h2h.outcomes[0].price,
    draw: h2h.outcomes[1].price,
    away: h2h.outcomes[2].price,
    ts: Date.now()
  };
}


// ====================================================================
// Compare new odds with previous snapshot
// ====================================================================
function processUpdates(newOdds) {
  if (!newOdds) return;

  if (!lastOdds) {
    lastOdds = newOdds;
    return;
  }

  const alerts = [];

  alerts.push(...detectMovement("Home", lastOdds.home, newOdds.home));
  alerts.push(...detectMovement("Draw", lastOdds.draw, newOdds.draw));
  alerts.push(...detectMovement("Away", lastOdds.away, newOdds.away));

  if (alerts.length) {
    history.unshift(...alerts);
    if (history.length > 20) history = history.slice(0, 20);
  }

  lastOdds = newOdds;
}


// ====================================================================
// Detect Movement (DROP / RISE / SHOCK)
// ====================================================================
function detectMovement(label, oldPrice, newPrice) {
  const diff = newPrice - oldPrice;
  const pct = ((newPrice - oldPrice) / oldPrice) * 100;

  const alerts = [];

  if (Math.abs(pct) < 1) return []; // ignore tiny noise

  let type = pct < 0 ? "DROP" : "RISE";

  let shock = Math.min(100, Math.abs(pct) * 4);

  alerts.push({
    label,
    from: oldPrice,
    to: newPrice,
    pct: pct.toFixed(2),
    type,
    shock,
    ts: Date.now()
  });

  return alerts;
}


// ====================================================================
// Render Market Radar
// ====================================================================
function renderRadar() {
  if (!history.length) {
    radarPanel.innerHTML = `<div class="empty-panel">No movements detected</div>`;
    return;
  }

  let html = `<div class="radar-title">Market Radar</div>`;

  history.forEach(a => {
    html += `
      <div class="radar-box ${a.type === "DROP" ? "drop" : "rise"}">
        <div class="radar-line">
          <span class="radar-type">${a.type}</span>
          <span class="radar-shock">Shock ${a.shock}</span>
        </div>

        <div class="radar-outcome">${a.label}</div>

        <div class="radar-info">
          ${a.from} → ${a.to}  (${a.pct}%)
        </div>

        <div class="radar-ts">${formatTime(a.ts)}</div>
      </div>
    `;
  });

  radarPanel.innerHTML = html;
}


// ====================================================================
// Format timestamp
// ====================================================================
function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
