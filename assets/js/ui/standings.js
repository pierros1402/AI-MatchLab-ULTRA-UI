// ====================================================================
// LEAGUE TABLE PANEL — STANDINGS ENGINE
// ====================================================================
//
// Δουλεύει με:
//   - hub-updated → παίρνει league_id
//   - demo standings dataset (local)
//
// ΑΡΓΟΤΕΡΑ: μπορεί να συνδεθεί με API-Football standings endpoint.
//
// ====================================================================

const stnPanel = document.getElementById("panel-standings");
if (!stnPanel) console.warn("[STANDINGS] panel missing");

let hub = null;
let standingsCache = null;


// --------------------------------------------------------------------
// Listen for Hub updates (match selected)
// --------------------------------------------------------------------
on("hub-updated", async data => {
  hub = data;
  await loadStandingsForLeague();
  renderStandings();
});


// --------------------------------------------------------------------
// LOAD standings for selected league
// --------------------------------------------------------------------
async function loadStandingsForLeague() {
  if (!hub) return;

  const leagueId = hub.match.league.id;

  // Demo dataset location
  const url = `/assets/demo/standings/${leagueId}.json`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Standings not found");
    standingsCache = await res.json();
  } catch (err) {
    console.warn("[STANDINGS] No standings for league:", leagueId);
    standingsCache = null;
  }
}


// --------------------------------------------------------------------
// MAIN RENDER FUNCTION
// --------------------------------------------------------------------
function renderStandings() {
  if (!hub) {
    stnPanel.innerHTML = `<div class="empty-panel">No match selected</div>`;
    return;
  }

  if (!standingsCache) {
    stnPanel.innerHTML = `<div class="empty-panel">No standings available</div>`;
    return;
  }

  const leagueName = hub.match.league.name;

  let html = `
    <div class="stn-title">${leagueName} — Standings</div>

    <table class="stn-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Team</th>
          <th>P</th>
          <th>GF</th>
          <th>GA</th>
          <th>Pts</th>
          <th>Form</th>
        </tr>
      </thead>
      <tbody>
  `;

  standingsCache.forEach(row => {
    html += `
      <tr>
        <td>${row.pos}</td>
        <td>${row.team}</td>
        <td>${row.played}</td>
        <td>${row.gf}</td>
        <td>${row.ga}</td>
        <td class="pts">${row.points}</td>
        <td>${renderFormMini(row.form)}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  stnPanel.innerHTML = html;
}


// --------------------------------------------------------------------
// MINI FORM RENDERER (W/D/L bubbles)
// --------------------------------------------------------------------
function renderFormMini(formArray) {
  return formArray.map(r => {
    const cls = r === "W" ? "fm-win" : r === "L" ? "fm-loss" : "fm-draw";
    return `<span class="fm-cell ${cls}">${r}</span>`;
  }).join("");
}
