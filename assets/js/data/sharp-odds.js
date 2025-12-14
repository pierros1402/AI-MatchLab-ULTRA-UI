// ====================================================================
// Sharp Odds Model (Pinnacle-style derived odds)
// ====================================================================

export function computeSharpOdds(probs) {
  // Apply reduced margin: Pinnacle-like
  const margin = 0.02; // 2% margin

  const adj = {
    home: normalizeProb(probs.home * (1 - margin)),
    draw: normalizeProb(probs.draw * (1 - margin)),
    away: normalizeProb(probs.away * (1 - margin))
  };

  const total = adj.home + adj.draw + adj.away;

  return {
    home: 1 / (adj.home / total),
    draw: 1 / (adj.draw / total),
    away: 1 / (adj.away / total)
  };
}

function normalizeProb(p) {
  return Math.max(0.01, Math.min(0.98, p));
}
