// ====================================================================
// TEAM PROFILE PANEL — TEAM INTELLIGENCE CARD
// ====================================================================
//
// Δουλεύει με event "team-selected"
// Δεν κάνει API fetch για την ώρα
// Χρησιμοποιεί δεδομένα από Match Hub + local calculations
//
// ====================================================================

const tpPanel = document.getElementById("panel-team-profile");
if (!tpPanel) console.warn("[TEAM PROFILE] panel missing");

let hub = null;
let currentTeam = null;


// Listen to hub updates (save latest hub)
on("hub-updated", data => {
  hub = data;
});


// Listen to team selection
on("team-selected", data => {
  currentTeam = data;
  renderTeamProfile();
});


// ====================================================================
// MAIN RENDER
// ====================================================================
function renderTeamProfile() {
  if (!hub || !currentTeam) {
    tpPanel.innerHTML = `<div class="empty-panel">No team selected</div>`;
    return;
  }

  const match = hub.match;
  const side = currentTeam.side; // home or away

  const team = match.teams[side];
  const form = side === "home" ? hub.homeForm : hub.awayForm;
  const rating = hub.ratings[side];

  // Basic derived stats
  const avgGF = hub.goalStats[side === "home" ? "avg_home" : "avg_away"];
  const avgGA = hub.goalStats[side === "home" ? "avg_away" : "avg_home"];

  const winPct  = percentage(form.filter(x => x === "W").length, form.length);
  const drawPct = percentage(form.filter(x => x === "D").length, form.length);
  const lossPct = percentage(form.filter(x => x === "L").length, form.length);

  let html = `
    <div class="tp-title">${team.name}</div>

    <div class="tp-section">
      <div class="tp-header">Team Rating</div>
      <div class="tp-value tp-big">${rating}</div>
    </div>

    <div class="tp-section">
      <div class="tp-header">Form</div>
      <div class="tp-form">${renderForm(form)}</div>
    </div>

    <div class="tp-section">
      <div class="tp-header">Goals Summary</div>
      <div class="tp-stats">
        <div>Avg Goals Scored: <b>${avgGF.toFixed(2)}</b></div>
        <div>Avg Goals Conceded: <b>${avgGA.toFixed(2)}</b></div>
      </div>
    </div>

    <div class="tp-section">
      <div class="tp-header">Result Percentages</div>
      <div class="tp-stats">
        <div>Win: <b>${winPct}%</b></div>
        <div>Draw: <b>${drawPct}%</b></div>
        <div>Loss: <b>${lossPct}%</b></div>
      </div>
    </div>
  `;

  tpPanel.innerHTML = html;
}


// ====================================================================
// Helpers
// ====================================================================
function renderForm(form) {
  return form.map(r => `
    <span class="tp-form-cell ${r === 'W' ? 'win' : r === 'L' ? 'loss' : 'draw'}">${r}</span>
  `).join("");
}

function percentage(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
