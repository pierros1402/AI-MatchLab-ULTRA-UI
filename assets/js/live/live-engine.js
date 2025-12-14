// ======================================================================
// LIVE ENGINE — AI MATCHLAB ULTRA
// Dispatches live odds into the system
// ======================================================================
//
// In production:
//   • Will receive odds from API / Websocket
//
// In demo mode:
//   • Receives odds from match-simulator.js
//
// ======================================================================

function pushLiveOdds(oddsFeed) {
  emit("live-odds-updated", oddsFeed);
}
// ======================================================================
// LIVE ENGINE — AI MATCHLAB ULTRA
// Dispatches live odds into the system
// ======================================================================
//
// In production:
//   • Will receive odds from API / Websocket
//
// In demo mode:
//   • Receives odds from match-simulator.js
//
// ======================================================================

function pushLiveOdds(oddsFeed) {
  emit("live-odds-updated", oddsFeed);
}

// ----------------------------------------------------------------------
// OPTIONAL: Live matches list bridge (for Saved panel "Live Saved")
// Call this from your live source when you have matches array.
// ----------------------------------------------------------------------
function pushLiveMatches(matches) {
  window.AIML_LIVE_MATCHES = Array.isArray(matches) ? matches : [];
  if (typeof emit === "function") emit("live-updated", { matches: window.AIML_LIVE_MATCHES });
}
