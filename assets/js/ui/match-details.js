// ====================================================================
// MATCH DETAILS PANEL — COMPLETE MODULE
// ====================================================================
//
// Δουλεύει με hub-updated:
//  - Fixture info
//  - Teams
//  - Venue
//  - Referee
//  - Weather (όταν υπάρχει από API-Football)
//  - Team Form
//  - Probabilities summary
//
// ====================================================================

const mdPanel = document.getElementById("panel-details");
if (!mdPanel) console.warn("[DETAILS] panel missing");

let hub = null;


// --------------------------------------------------------------------
// Listen for Hub updates
// --------------------------------------------------------------------
on("hub-updated", data => {
  hub = data;
  renderMatchDetails();
});


// --------------------------------------------------------------------
// RENDER MAIN CONTENT
// --------------------------------------------------------------------
function renderMatchDetails() {
  if (!hub) {
    mdPanel.innerHTML = `<div class="empty-panel">No match selected</div>`;
    return;
  }

  const { match, homeForm, awayForm, probabilities, ratings } = hub;

  const home = match.teams.home;
  const away = match.teams.away;

  const venue = match.fixture.venue?.name || "Unknown venue";
  const city  = match.fixture.venue?.city || "";

  const referee = match.fixture.referee || "Not assigned";
  const weather = match.fixture.weather?.description || "N/A";

  let html = `
    <div class="md-title">${home.name} vs ${away.name}</div>

    <div class="md-section">
      <div class="md-header">Venue</div>
      <div class="md-item">${venue} — ${city}</div>
    </div>

    <div class="md-section">
      <div class="md-header">Referee</div>
      <div class="md-item">${referee}</div>
    </div>

    <div class="md-section">
      <div class="md-header">Weather</div>
      <div class="md-item">${weather}</div>
    </div>

    <div class="md-section">
      <div class="md-header">Team Form</div>
      <div class="md-form">
        <div class="md-form-team">
          <div class="md-team-label">${home.name}</div>
          <div class="md-form-bar">${renderForm(homeForm)}</div>
        </div>
        <div class="md-form-team">
          <div class="md-team-label">${away.name}</div>
          <div class="md-form-bar">${renderForm(awayForm)}</div>
        </div>
      </div>
    </div>

    <div class="md-section">
      <div class="md-header">Model Summary</div>
      <div class="md-summary">
        <div>Home Rating: <b>${ratings.home}</b></div>
        <div>Away Rating: <b>${ratings.away}</b></div>
        <div>Home Win Prob: <b>${(probabilities.home*100).toFixed(1)}%</b></div>
        <div>Draw Prob: <b>${(probabilities.draw*100).toFixed(1)}%</b></div>
        <div>Away Win Prob: <b>${(probabilities.away*100).toFixed(1)}%</b></div>
      </div>
    </div>
  `;

  mdPanel.innerHTML = html;
}


// --------------------------------------------------------------------
// Render Form (W, D, L boxes)
// --------------------------------------------------------------------
function renderForm(form) {
  return form.map(r => `
    <span class="md-form-cell ${r === 'W' ? 'win' : r === 'L' ? 'loss' : 'draw'}">${r}</span>
  `).join("");
}
