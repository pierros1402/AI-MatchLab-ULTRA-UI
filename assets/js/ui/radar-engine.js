// ====================================================================
// AI MATCHLAB ULTRA - RADAR ENGINE
// Shows only the biggest odds movements of the day
// Refresh = 1 time / 6 hours (cached by API CORE)
// ====================================================================

import { API } from "../data/api-core.js";
import { mapRadar } from "../data/radar-mapper.js";

console.log("[RADAR ENGINE] Loaded");

const panel = document.getElementById("panel-radar");

if (!panel) {
  console.warn("[RADAR] panel-radar not found in DOM");
}


// ================================================================
// EVENT LISTENER: LEAGUE SELECTED
// ================================================================
on("league-selected", async leagueId => {
  console.log("[RADAR] Loading radar movements for league:", leagueId);

  panel.innerHTML = `<div class="loading">Loading odds movements...</div>`;

  try {
    const raw = await API.getRadar();
    const items = mapRadar(raw);

    // Filter for this specific league
    // Note: Radar API does not always include league_id, depends on provider.
    // We keep this optional & fallback to showing all items.
    const filtered = items.filter(x =>
      !x.league_id || String(x.league_id) === String(leagueId)
    );

    if (!filtered.length) {
      panel.innerHTML = `<div class="empty-panel">No significant movements</div>`;
      return;
    }

    renderRadar(filtered);

  } catch (err) {
    console.error("[RADAR ERROR]", err);
    panel.innerHTML = `<div class="empty-panel">Radar unavailable</div>`;
  }
});


// ================================================================
// RENDER RADAR ITEMS
// ================================================================
function renderRadar(list) {
  panel.innerHTML = list
    .map(item => {
      const odds = item.odds
        .map(o => `<span class="radar-odd">${o.name}: ${o.price}</span>`)
        .join("");

      return `
        <div class="radar-row">
          <div class="radar-match">${item.home} vs ${item.away}</div>
          <div class="radar-odds">${odds}</div>
          <div class="radar-time">${item.movement}</div>
        </div>
      `;
    })
    .join("");
}
