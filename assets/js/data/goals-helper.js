// ====================================================================
// Goals Helper — Compute Goal Expectancy & Stats
// ====================================================================

export function computeGoalStats({ homeForm, awayForm, h2h, leagueAvg }) {
  
  // ------------------------------
  // FORM GOALS (last 5)
  // ------------------------------
  const homeGF = avg(homeForm.map(m => m.gf));
  const homeGA = avg(homeForm.map(m => m.ga));
  const awayGF = avg(awayForm.map(m => m.gf));
  const awayGA = avg(awayForm.map(m => m.ga));

  // ------------------------------
  // H2H goals
  // ------------------------------
  const h2hGoals = h2h.length
    ? avg(h2h.map(m => m.gf + m.ga))
    : leagueAvg; // fallback

  // ------------------------------
  // Goal Expectancy Model
  // ------------------------------
  const expectancy =
    (homeGF + awayGF + leagueAvg + h2hGoals) / 4;

  // ------------------------------
  // Probabilities (very simplified stat model)
  // ------------------------------
  const probs = {
    over05: clamp(expectancy * 0.85),
    over15: clamp(expectancy * 0.65),
    over25: clamp(expectancy * 0.50),
    over35: clamp(expectancy * 0.32),
    under25: clamp(1 - (expectancy * 0.50))
  };

  return {
    expectancy: round(expectancy),
    homeGF: round(homeGF),
    awayGF: round(awayGF),
    leagueAvg: round(leagueAvg),
    h2hGoals: round(h2hGoals),
    probs
  };
}

// Utility helpers
function avg(arr) { return arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0; }
function round(n) { return Math.round(n * 100) / 100; }
function clamp(n) { return Math.min(0.99, Math.max(0.01, n)); }
