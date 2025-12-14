// ====================================================================
// UNDER / OVER PANEL (HUB VERSION — COMPLETE)
// ====================================================================

const panel = document.getElementById("panel-uo");

if (!panel) {
  console.warn("[UO] panel not found");
}


// ====================================================================
// LISTEN TO HUB
// ====================================================================
on("hub:ready", hub => {
  if (!hub || !hub.goalStats) {
    panel.innerHTML = `<div class="empty-panel">No goal model available</div>`;
    return;
  }

  panel.innerHTML = renderUO(hub.goalStats);
});


// ====================================================================
// RENDER
// ====================================================================
function renderUO(s) {
  return `
    <div class="uo-title">Goal Expectancy: <b>${s.expectancy}</b></div>

    <div class="uo-block">
      <div>League Avg Goals: <b>${s.leagueAvg}</b></div>
      <div>H2H Avg Goals: <b>${s.h2hGoals}</b></div>
      <div>Home GF Avg: <b>${s.homeGF}</b></div>
      <div>Away GF Avg: <b>${s.awayGF}</b></div>
    </div>

    <div class="uo-prob">
      <div>Over 0.5: <b>${pct(s.probs.over05)}</b></div>
      <div>Over 1.5: <b>${pct(s.probs.over15)}</b></div>
      <div>Over 2.5: <b>${pct(s.probs.over25)}</b></div>
      <div>Over 3.5: <b>${pct(s.probs.over35)}</b></div>
      <div>Under 2.5: <b>${pct(s.probs.under25)}</b></div>
    </div>
  `;
}

function pct(n) {
  return Math.round(n * 100) + "%";
}
