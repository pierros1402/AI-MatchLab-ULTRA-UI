// ====================================================================
// Expected Value Helper Functions
// ====================================================================

// Convert bookmaker odds → implied probability
export function impliedProb(odds) {
  return odds > 1 ? (1 / odds) : 0;
}

// Convert expected probability → fair odds
export function fairOdds(prob) {
  return prob > 0 ? (1 / prob) : null;
}

// Compute EV % = (FairOdds - MarketOdds) / MarketOdds
export function expectedValue(fair, market) {
  if (!fair || !market) return 0;
  return (fair - market) / market;
}

// Clamp percent to readable number
export function pct(n) {
  return Math.round(n * 1000) / 10; // one decimal
}
