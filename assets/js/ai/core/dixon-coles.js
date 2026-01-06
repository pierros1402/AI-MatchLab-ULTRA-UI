// =====================================================
// Dixon–Coles Bivariate Poisson Core
// File: engine/dixon-coles.js
// =====================================================

// --- Utility: factorial ---
function factorial(n) {
  if (n === 0) return 1;
  let r = 1;
  for (let i = 1; i <= n; i++) r *= i;
  return r;
}

// --- Poisson PMF ---
function poissonPMF(k, lambda) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

// --- Dixon–Coles low-score correction ---
function dcCorrection(x, y, lambdaHome, lambdaAway, rho) {
  if (x === 0 && y === 0) return 1 - (lambdaHome * lambdaAway * rho);
  if (x === 0 && y === 1) return 1 + (lambdaHome * rho);
  if (x === 1 && y === 0) return 1 + (lambdaAway * rho);
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

// =====================================================
// MAIN ENGINE
// =====================================================
export function dixonColesModel({
  home,
  away,
  leagueAvgGoals = 1.35,
  homeAdvantage = 1.08,
  rho = -0.08,
  maxGoals = 6
}) {
  // --- Expected goals ---
  const lambdaHome =
    leagueAvgGoals * home.att * away.def * (homeAdvantage || 1);

  const lambdaAway =
    leagueAvgGoals * away.att * home.def;

  // --- Score matrix ---
  const matrix = [];
  let totalProb = 0;

  for (let x = 0; x <= maxGoals; x++) {
    matrix[x] = [];
    for (let y = 0; y <= maxGoals; y++) {
      const baseProb =
        poissonPMF(x, lambdaHome) *
        poissonPMF(y, lambdaAway);

      const correction = dcCorrection(
        x,
        y,
        lambdaHome,
        lambdaAway,
        rho
      );

      const p = baseProb * correction;
      matrix[x][y] = p;
      totalProb += p;
    }
  }

  // --- Normalize (numerical safety) ---
  for (let x = 0; x <= maxGoals; x++) {
    for (let y = 0; y <= maxGoals; y++) {
      matrix[x][y] /= totalProb;
    }
  }

  // --- Market probabilities ---
  let pHome = 0,
    pDraw = 0,
    pAway = 0,
    pOver25 = 0,
    pBTTS = 0;

  for (let x = 0; x <= maxGoals; x++) {
    for (let y = 0; y <= maxGoals; y++) {
      const p = matrix[x][y];

      if (x > y) pHome += p;
      else if (x === y) pDraw += p;
      else pAway += p;

      if (x + y >= 3) pOver25 += p;
      if (x > 0 && y > 0) pBTTS += p;
    }
  }

  return {
    expectedGoals: {
      home: Number(lambdaHome.toFixed(3)),
      away: Number(lambdaAway.toFixed(3))
    },
    markets: {
      homeWin: Number(pHome.toFixed(4)),
      draw: Number(pDraw.toFixed(4)),
      awayWin: Number(pAway.toFixed(4)),
      over25: Number(pOver25.toFixed(4)),
      btts: Number(pBTTS.toFixed(4))
    },
    scoreMatrix: matrix
  };
}
