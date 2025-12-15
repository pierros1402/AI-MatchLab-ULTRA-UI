// ====================================================================
// LIVE MATCH ENGINE — COMPLETE
// ====================================================================
//
// - Εμφανίζει live score, minute, status
// - Κάνει refresh κάθε 25 sec
// - Μειώνει API usage στο ελάχιστο
// - Δουλεύει με single selected match
// ====================================================================

const panel = document.getElementById("panel-live");

if (!panel) {
  console.warn("[LIVE] panel-live not found");
}

let currentMatch = null;
let refreshTimer = null;


// ====================================================================
// LISTEN TO HUB (match selected)
// ====================================================================
on("match-selected", hubMatch => {
  currentMatch = hubMatch;
  panel.innerHTML = `<div class="loading">Waiting live feed...</div>`;

  // καθαρισμός παλιού timer αν υπάρχει
  if (refreshTimer) clearInterval(refreshTimer);

  // φόρτωσε άμεσα live data
  loadLive();

  // auto-refresh κάθε 25 sec
  refreshTimer = setInterval(loadLive, 25000);
});


// ====================================================================
// MAIN LIVE LOADER
// ====================================================================
async function loadLive() {
  if (!currentMatch) return;

  try {
    const live = await fetchLive(currentMatch.fixture_id);

    panel.innerHTML = renderLive(live);

    // αν ο αγώνας τελείωσε -> σταμάτα refresh
    if (live.status_short === "FT" || live.status_short === "AET") {
      clearInterval(refreshTimer);
    }

  } catch (err) {
    console.error("[LIVE ERROR]", err);
    panel.innerHTML = `<div class="empty-panel">Live data unavailable</div>`;
  }
}


// ====================================================================
// FETCH LIVE DATA FROM API (light usage)
// ====================================================================
async function fetchLive(fixtureId) {
  const url = `/proxy/live-match?fixture=${fixtureId}`; 
  // το proxy είναι worker/endpoint που ήδη έχεις δομήσει

  const res = await fetch(url);
  if (!res.ok) throw new Error("Live fetch failed");

  const data = await res.json();
  return data.response[0];
}


// ====================================================================
// RENDER LIVE PANEL
// ====================================================================
function renderLive(live) {

  const minute = live.time.elapsed ? `${live.time.elapsed}'` : "-";
  const score = `${live.goals.home ?? 0} - ${live.goals.away ?? 0}`;
  const status = live.status.long || "Unknown";

  return `
    <div class="live-header">
      <div class="live-score">${score}</div>
      <div class="live-minute">${minute}</div>
      <div class="live-status">${status}</div>
    </div>

    ${renderBox("Attacks", live.stats?.attacks)}
    ${renderBox("Shots on Target", live.stats?.shots_on)}
    ${renderBox("Shots Off Target", live.stats?.shots_off)}
    ${renderBox("Possession", live.stats?.possession)}
  `;
}


// ====================================================================
// RENDER STAT LINE
// ====================================================================
function renderBox(label, value) {
  if (!value && value !== 0) return "";

  return `
    <div class="live-box">
      <div class="live-label">${label}</div>
      <div class="live-value">${value}</div>
    </div>
  `;
}
