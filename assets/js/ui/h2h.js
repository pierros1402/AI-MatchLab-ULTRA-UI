// ====================================================================
// H2H PANEL — HEAD TO HEAD ENGINE
// ====================================================================
//
// Δουλεύει με:
//   - hub-updated (παιρνει home_id, away_id)
//   - demo dataset για H2H
//
// ====================================================================

const h2hPanel = document.getElementById("panel-h2h");
if (!h2hPanel) console.warn("[H2H] panel missing");

let hub = null;
let h2hData = null;


// --------------------------------------------------------------------
// Listen for Hub updates
// --------------------------------------------------------------------
on("hub-updated", async data => {
  hub = data;
  await loadH2HData();
  renderH2H();
});


// --------------------------------------------------------------------
// LOAD H2H demo data
// --------------------------------------------------------------------
async function loadH2HData() {
  if (!hub) return;

  const homeId = hub.match.teams.home.id;
  const awayId = hub.match.teams.away.id;

  const filename = `${homeId}_${awayId}.json`;
  const url = `/assets/demo/h2h/${filename}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("No H2H found");
    h2hData = await res.json();
  } catch (err) {
    console.warn("[H2H] No file:", filename);
    h2hData = null;
  }
}


// --------------------------------------------------------------------
// MAIN RENDER
// --------------------------------------------------------------------
function renderH2H() {
  if (!hub) {
    h2hPanel.innerHTML = `<div class="empty-panel">No match selected</div>`;
    return;
  }

  if (!h2hData) {
    h2hPanel.innerHTML = `<div class="empty-panel">No H2H data</div>`;
    return;
  }

  const homeName = hub.match.teams.home.name;
  const awayName = hub.match.teams.away.name;

  // Compute stats
  const games = h2hData.length;
  const goals = h2hData.reduce((s, m) => s + m.home_goals + m.away_goals, 0);
  const avgGoals = (goals / games).toFixed(2);

  const btts = h2hData.filter(m => m.home_goals > 0 && m.away_goals > 0).length;
  const bttsPct = Math.round((btts / games) * 100);

  const over25 = h2hData.filter(m => m.home_goals + m.away_goals > 2).length;
  const over25Pct = Math.round((over25 / games) * 100);

  // Build HTML
  let html = `
    <div class="h2h-title">H2H — ${homeName} vs ${awayName}</div>

    <div class="h2h-section">
      <div class="h2h-metric">Avg Goals per Match: <b>${avgGoals}</b></div>
      <div class="h2h-metric">BTTS: <b>${bttsPct}%</b></div>
      <div class="h2h-metric">Over 2.5: <b>${over25Pct}%</b></div>
    </div>

    <div class="h2h-subtitle">Last ${games} meetings</div>
  `;

  h2hData.forEach(m => {
    const result = `${m.home_goals}-${m.away_goals}`;
    const winner =
      m.home_goals > m.away_goals ? "win-home" :
      m.home_goals < m.away_goals ? "win-away" :
      "draw";

    html += `
      <div class="h2h-item ${winner}">
        <div class="h2h-date">${m.date}</div>
        <div class="h2h-teams">${m.home} vs ${m.away}</div>
        <div class="h2h-score">${result}</div>
        <div class="h2h-comp">${m.competition}</div>
      </div>
    `;
  });

  h2hPanel.innerHTML = html;
}
