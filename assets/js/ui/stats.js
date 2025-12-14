// ====================================================================
// MATCH STATS PANEL — TEAM COMPARISON
// ====================================================================
//
// Δουλεύει με:
//  - live stats (live.stats)
//  - hub-updated (fallback when no live stats)
// 
// ====================================================================

const stPanel = document.getElementById("panel-stats");
if (!stPanel) console.warn("[STATS] panel missing");

let hub = null;
let liveStats = null;


// --------------------------------------------------------------------
// Listen for hub updates (initial load)
// --------------------------------------------------------------------
on("hub-updated", data => {
  hub = data;
  if (!liveStats) renderStats(); // fallback
});


// --------------------------------------------------------------------
// Listen for live stats updates
// --------------------------------------------------------------------
on("live-stats-loaded", data => {
  liveStats = data.stats;
  renderStats();
});


// ====================================================================
// MAIN RENDER FUNCTION
// ====================================================================
function renderStats() {
  if (!hub) {
    stPanel.innerHTML = `<div class="empty-panel">No match selected</div>`;
    return;
  }

  const match = hub.match;
  const home = match.teams.home.name;
  const away = match.teams.away.name;

  const stats = liveStats || {}; // use live stats if available

  // Extract values safely
  const possessionH = stats.possession?.home || 50;
  const possessionA = stats.possession?.away || 50;

  const shotsH = stats.shots_total?.home || 0;
  const shotsA = stats.shots_total?.away || 0;

  const shotsOnH = stats.shots_on?.home || 0;
  const shotsOnA = stats.shots_on?.away || 0;

  const attacksH = stats.attacks?.home || 0;
  const attacksA = stats.attacks?.away || 0;

  const dangerousH = stats.dangerous?.home || 0;
  const dangerousA = stats.dangerous?.away || 0;

  const cornersH = stats.corners?.home || 0;
  const cornersA = stats.corners?.away || 0;

  let html = `<div class="st-title">Match Stats</div>`;

  html += statRow("Possession", possessionH, possessionA, "%");
  html += statRow("Total Shots", shotsH, shotsA);
  html += statRow("Shots on Target", shotsOnH, shotsOnA);
  html += statRow("Attacks", attacksH, attacksA);
  html += statRow("Dangerous Attacks", dangerousH, dangerousA);
  html += statRow("Corners", cornersH, cornersA);

  // Future extension (xG)
  if (stats.xg) {
    html += statRow("Expected Goals (xG)", stats.xg.home, stats.xg.away);
  }

  stPanel.innerHTML = html;
}


// ====================================================================
// ROW RENDERER
// ====================================================================
function statRow(label, homeVal, awayVal, unit="") {

  const total = (Number(homeVal) + Number(awayVal)) || 1;
  const homePct = (homeVal / total) * 100;
  const awayPct = (awayVal / total) * 100;

  return `
    <div class="st-row">
      <div class="st-label">${label}</div>

      <div class="st-bar">
        <div class="st-bar-home" style="width:${homePct}%;"></div>
        <div class="st-bar-away" style="width:${awayPct}%;"></div>
      </div>

      <div class="st-values">
        <span>${homeVal}${unit}</span>
        <span>${awayVal}${unit}</span>
      </div>
    </div>
  `;
}
