// ====================================================================
// Match Probability Model (hybrid)
// ====================================================================

export function computeMatchProbabilities(match, uoStats, ratings) {
  
  // Strength ratio
  const totalRating = ratings.home + ratings.away || 1;
  const baseHome = ratings.home / totalRating;
  const baseAway = ratings.away / totalRating;

  // Goal expectancy impact
  const ge = uoStats.expectancy;

  // Adjust based on goal expectancy:
  let pHome = baseHome * (1 + (ge - 2.5) * 0.12);
  let pAway = baseAway * (1 + (ge - 2.5) * 0.12);

  // Draw probability estimated from goal expectancy
  let pDraw = Math.max(0.05, 1 - (pHome + pAway));

  // Normalize
  const total = pHome + pDraw + pAway;
  pHome /= total;
  pDraw /= total;
  pAway /= total;

  return {
    home: pHome,
    draw: pDraw,
    away: pAway
  };
}
