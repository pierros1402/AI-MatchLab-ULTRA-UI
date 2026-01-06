// =====================================================
// Market / Regime Filters
// File: assets/js/ai/validate/market-filter.js
// =====================================================

/**
 * allowBet
 * Returns true if a bet is allowed under market/regime rules.
 *
 * side: "home" | "draw" | "away"
 * odd: decimal odd
 * context: optional extra info (league, date, etc.)
 */

export function allowBet(side, odd, context = {}) {
  if (!odd || odd <= 1.01) return false;

  // -----------------------------
  // GLOBAL EXCLUSIONS
  // -----------------------------
  // Exclude heavy favorites everywhere
  if (odd < 1.45) return false;

  // -----------------------------
  // MARKET-SPECIFIC RULES (ENG1 tuned)
  // -----------------------------
  if (side === "away") {
    // Away underdogs: sweet spot
    if (odd >= 3.2 && odd <= 6.5) return true;
    return false;
  }

  if (side === "draw") {
    // Draw mid-range
    if (odd >= 3.4 && odd <= 4.2) return true;
    return false;
  }

  if (side === "home") {
    // Home medium odds only (avoid strong favorites)
    if (odd >= 1.9 && odd <= 2.8) return true;
    return false;
  }

  return false;
}
