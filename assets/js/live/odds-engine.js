// ======================================================================
// ODDS ENGINE — AI MATCHLAB ULTRA
// Aggregation • Movement Tracking • Radar Trigger
// ======================================================================

let ODDS_BOOKMAKERS = {};
let ODDS_HISTORY = {};
let LAST_TOPPICKS = 0;

const RADAR_THRESHOLD = 0.12;   // 12%
const TOPPICKS_INTERVAL = 3000;


// Receive unified odds input
on("live-odds-updated", raw => {
  const unified = unifyOdds(raw);
  trackMovement(unified);

  ODDS_BOOKMAKERS = unified;
  emit("odds-processed", unified);

  const now = Date.now();
  if (now - LAST_TOPPICKS > TOPPICKS_INTERVAL) {
    emit("top-picks-update", unified);
    LAST_TOPPICKS = now;
  }
});


// -----------------------
// 1) Normalize structure
// -----------------------
function unifyOdds(raw) {
  const out = {};

  Object.entries(raw).forEach(([book, data]) => {
    if (!data || !data.odds) return;

    out[book] = {
      home: Number(data.odds.home) || null,
      draw: Number(data.odds.draw) || null,
      away: Number(data.odds.away) || null,
      implied: impliedProbabilities(data.odds),
      ts: Date.now()
    };
  });

  return out;
}


// -----------------------
// 2) Implied probabilities
// -----------------------
function impliedProbabilities(o) {
  const h = 1 / (o.home || 999);
  const d = 1 / (o.draw || 999);
  const a = 1 / (o.away || 999);
  const sum = h + d + a;

  return {
    home: h / sum,
    draw: d / sum,
    away: a / sum
  };
}


// -----------------------
// 3) Movement detection
// -----------------------
function trackMovement(unified) {
  Object.entries(unified).forEach(([book, line]) => {
    if (!ODDS_HISTORY[book]) {
      ODDS_HISTORY[book] = { ...line };
      return;
    }

    ["home", "draw", "away"].forEach(sel => {
      const oldVal = ODDS_HISTORY[book][sel];
      const newVal = line[sel];

      if (!oldVal || !newVal) return;

      const diff = (oldVal - newVal) / oldVal;

      if (Math.abs(diff) >= RADAR_THRESHOLD) {
        emit("odds-radar-event", {
          bookmaker: book,
          side: sel,
          old: oldVal,
          new: newVal,
          change: diff,
          when: Date.now()
        });
      }
    });

    ODDS_HISTORY[book] = { ...line };
  });
}
