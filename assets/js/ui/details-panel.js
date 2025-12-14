// ======================================================================
// MATCH DETAILS PANEL — AI MATCHLAB ULTRA
// Displays live match info (score, events, timeline)
// ======================================================================

let CURRENT_MATCH = null;

// When a match is selected
on("match-selected", match => {
  CURRENT_MATCH = match;
  renderMatchDetails(match);
});


// When simulator sends an update
on("match-update", update => {
  if (!CURRENT_MATCH) return;
  if (CURRENT_MATCH.id !== update.id) return;

  CURRENT_MATCH = Object.assign(CURRENT_MATCH, update);
  renderMatchDetails(CURRENT_MATCH);
});


// Render panel
function renderMatchDetails(m) {
  const panel = document.getElementById("panel-match-details");
  if (!panel) return;

  panel.innerHTML = `
    <div class="md-teams">${m.home} vs ${m.away}</div>
    <div class="md-score">${m.score}</div>
    <div class="md-minute">${m.minute}'</div>

    <div class="md-events">
      ${(m.events || []).map(ev => `
        <div class="md-event">
          <span class="ev-min">${ev.minute}'</span>
          <span class="ev-type">${ev.type}</span>
          <span class="ev-team">${ev.team}</span>
        </div>
      `).join("")}
    </div>
  `;
}
