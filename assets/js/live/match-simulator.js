// ======================================================================
// MATCH SIMULATOR — AI MATCHLAB ULTRA
// Goals • Cards • Minute • Odds • Market Waves
// ======================================================================

let SIM_INTERVAL = null;
let CURRENT_DEMO_MATCH = null;


// Start demo mode
function startMatchSimulator() {
  console.log("[SIM] Match Simulator Started.");

  CURRENT_DEMO_MATCH = {
    id: "M1",
    home: "Team A",
    away: "Team B",
    minute: 0,
    score: "0 - 0",
    goalsHome: 0,
    goalsAway: 0,
    events: []
  };

  SIM_INTERVAL = setInterval(simTick, 3000);
}


// -------------------------------
// SIMULATION TICK
// -------------------------------
function simTick() {

  // 1) Time progression
  CURRENT_DEMO_MATCH.minute += randomInt(1, 3);
  if (CURRENT_DEMO_MATCH.minute > 95) {
    clearInterval(SIM_INTERVAL);
    console.log("[SIM] Match Ended.");
    return;
  }

  // 2) Random events (10% chance)
  if (Math.random() < 0.10) simulateEvent();

  // 3) Generate odds feed
  const oddsFeed = simulateOdds();

  // 4) Push odds to engine
  pushLiveOdds(oddsFeed);

  // 5) Emit match update
  emit("match-update", CURRENT_DEMO_MATCH);
}


// -------------------------------
// SIMULATE MATCH EVENTS
// -------------------------------
function simulateEvent() {
  const type = Math.random() < 0.8 ? "Goal" : "Red Card";
  const team = Math.random() < 0.5 ? CURRENT_DEMO_MATCH.home : CURRENT_DEMO_MATCH.away;

  if (type === "Goal") {
    if (team === CURRENT_DEMO_MATCH.home) CURRENT_DEMO_MATCH.goalsHome++;
    else CURRENT_DEMO_MATCH.goalsAway++;

    CURRENT_DEMO_MATCH.score = `${CURRENT_DEMO_MATCH.goalsHome} - ${CURRENT_DEMO_MATCH.goalsAway}`;
  }

  CURRENT_DEMO_MATCH.events.unshift({
    minute: CURRENT_DEMO_MATCH.minute,
    type,
    team
  });
}


// -------------------------------
// SIMULATE ODDS
// -------------------------------
function simulateOdds() {

  const t = CURRENT_DEMO_MATCH.minute;

  // Base odds that move slowly
  const baseHome = wave(1.50, 2.40, t);
  const baseDraw = wave(3.00, 3.80, t + 10);
  const baseAway = wave(3.80, 5.20, t + 20);

  // Shock factor after goals
  const goalShock = (CURRENT_DEMO_MATCH.goalsHome - CURRENT_DEMO_MATCH.goalsAway) * 0.15;

  const home = (baseHome * (1 - goalShock)).toFixed(2);
  const draw = baseDraw.toFixed(2);
  const away = (baseAway * (1 + goalShock)).toFixed(2);

  return {
    "Bet365":     { odds: { home, draw, away } },
    "Stoiximan":  { odds: { home: adj(home), draw, away } },
    "Pamestoixima": { odds: { home, draw: adj(draw), away } },
    "Betshop":    { odds: { home, draw, away: adj(away) } },
    "Pinnacle":   { odds: { home: adj(home), draw: adj(draw), away: adj(away) } }
  };
}


// -------------------------------
// UTILITIES
// -------------------------------
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function wave(min, max, t) {
  return min + (max - min) * Math.abs(Math.sin(t * 0.15));
}

function adj(v) {
  v = parseFloat(v);
  return (v * (0.98 + Math.random() * 0.04)).toFixed(2);
}
