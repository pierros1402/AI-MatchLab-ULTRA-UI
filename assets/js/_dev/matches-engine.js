// ====================================================================
// MATCHES ENGINE — COMPLETE
// ====================================================================
//
// - Φορτώνει αγώνες ανά λίγκα για την τρέχουσα ημέρα
// - Ελαχιστοποιεί API usage (1 fetch / refresh cycle)
// - Εμφανίζει live state & score
// - Με κλικ: emit("match-selected", matchObject)
// - Αυτόματα refresh κάθε 25 sec
//
// ====================================================================

const panel = document.getElementById("panel-matches");

if (!panel) {
  console.warn("[MATCHES] panel-matches not found");
}

let currentLeague = null;
let matches = [];
let refreshTimer = null;


// ====================================================================
// LISTEN TO LEAGUE SELECTION
// ====================================================================
//
// Το αριστερό panel, όταν επιλέξεις λίγκα,
// εκπέμπει event:  emit("league-selected", { league_id })
//
// ====================================================================

on("league-selected", async data => {
  currentLeague = data.league_id;
  panel.innerHTML = `<div class="loading">Loading matches...</div>`;

  if (refreshTimer) clearInterval(refreshTimer);

  await loadMatches();

  // AUTO REFRESH (25 sec)
  refreshTimer = setInterval(loadMatches, 25000);
});


// ====================================================================
// LOAD MATCHES
// ====================================================================
async function loadMatches() {
  if (!currentLeague) return;

  try {
    const list = await fetchMatches(currentLeague);
    matches = list;
    renderMatches();

  } catch (err) {
    console.error("[MATCHES] ERROR", err);
    panel.innerHTML = `<div class="empty-panel">No matches available</div>`;
  }
}


// ====================================================================
// FETCH MATCHES — using your proxy (light usage)
// ====================================================================
async function fetchMatches(leagueId) {
  const url = `/proxy/matches-today?league=${leagueId}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Match fetch failed");

  const data = await res.json();
  return data.response;
}


// ====================================================================
// RENDER MATCH LIST
// ====================================================================
function renderMatches() {
  if (!matches.length) {
    panel.innerHTML = `<div class="empty-panel">No matches today</div>`;
    return;
  }

  let html = `<div class="matches-title">Today's Fixtures</div>`;

  matches.forEach(m => {
    html += renderMatchRow(m);
  });

  panel.innerHTML = html;

  // Add onclick bindings AFTER rendering
  attachMatchClicks();
}



// ====================================================================
// RENDER INDIVIDUAL MATCH ROW
// ====================================================================
function renderMatchRow(m) {
  const status = m.fixture.status.short;
  const minute = m.fixture.status.elapsed;

  const kick = m.fixture.date.slice(11, 16); // HH:MM

  let score = "-";
  if (m.goals.home !== null && m.goals.away !== null) {
    score = `${m.goals.home} - ${m.goals.away}`;
  }

  const isLive = ["1H","2H","ET","P","LIVE"].includes(status);

  return `
    <div class="match-row" data-id="${m.fixture.id}">
      <div class="match-teams">
        ${m.teams.home.name} vs ${m.teams.away.name}
      </div>

      <div class="match-info ${isLive ? "live" : ""}">
        <div class="match-score">${score}</div>
        <div class="match-time">
          ${isLive ? `${minute}'` : kick}
        </div>
        <div class="match-status">${status}</div>
      </div>
    </div>
  `;
}



// ====================================================================
// CLICK HANDLERS — SELECT MATCH
// ====================================================================
function attachMatchClicks() {
  const rows = panel.querySelectorAll(".match-row");

  rows.forEach(row => {
    row.onclick = () => {
      const id = row.getAttribute("data-id");

      const match = matches.find(m => m.fixture.id == id);
      if (!match) return;

      emit("match-selected", match);
    };
  });
}
