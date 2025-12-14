// ====================================================================
// AI MATCHLAB ULTRA - STANDINGS ENGINE
// Loads league standings → maps them → renders table
// ====================================================================

import { API } from "../data/api-core.js";
import { mapStandings } from "../data/standings-mapper.js";

console.log("[STANDINGS ENGINE] Loaded");

const panel = document.getElementById("panel-standings");

if (!panel) {
  console.warn("[STANDINGS] panel-standings not found in DOM");
}


// ================================================================
// EVENT LISTENER: LEAGUE SELECTED
// ================================================================
on("league-selected", async leagueId => {
  console.log("[STANDINGS] Loading standings for league:", leagueId);

  panel.innerHTML = `<div class="loading">Loading standings...</div>`;

  try {
    const raw = await API.getStandings(leagueId);
    const table = mapStandings(raw);

    if (!table.length) {
      panel.innerHTML = `<div class="empty-panel">No standings available</div>`;
      return;
    }

    renderStandings(table);
  } catch (err) {
    console.error("[STANDINGS ERROR]", err);
    panel.innerHTML = `<div class="empty-panel">Standings unavailable</div>`;
  }
});


// ================================================================
// RENDER TABLE
// ================================================================
function renderStandings(rows) {
  panel.innerHTML = `
    <div class="standings-table">
      <div class="s-header">
        <span>#</span>
        <span>Team</span>
        <span>P</span>
        <span>Pts</span>
      </div>
      ${rows.map(renderRow).join("")}
    </div>
  `;
}

function renderRow(t) {
  return `
    <div class="s-row">
      <span class="s-rank">${t.rank}</span>
      <span class="s-team">
        <img src="${t.logo}" class="s-logo">
        ${t.name}
      </span>
      <span class="s-played">${t.played}</span>
      <span class="s-points">${t.points}</span>
    </div>
  `;
}
