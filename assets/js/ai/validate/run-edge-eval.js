// assets/js/ai/validate/run-edge-eval.js
// EDGE ENGINE v1 — Market Disagreement Evaluator
// Uses existing model as signal only (LOCKED)
// Calibration alpha = 0.30 (LOCKED)
// Policy: 1 bet per match, max edge, flat stake
// Output: threshold sweep -> ROI / bets / hit rate / avg odds

import fs from "fs";
import path from "path";

import { importLeagueSeasonFolder } from "../data/csv-importer.js";
import { buildTeamStates } from "../team/team-strength.js";
import { getLeaguePrior } from "../core/league_priors.js";
import { buildLambda } from "../core/lambda_builder.js";

// -----------------------------
// CONFIG (LOCKED WHERE NOTED)
// -----------------------------
const DATA_ROOT = "./data/football-data";
const POISSON_K_MAX = 10;
const PROGRESS_EVERY = 5000;

// Calibration (LOCKED from sweep)
const ALPHA = 0.30;

// Edge thresholds to evaluate
const THRESHOLDS = [0.05, 0.10, 0.15, 0.20, 0.25];

// Numeric safety
const EPS = 1e-15;

// -----------------------------
// Helpers
// -----------------------------
function factorial(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function poissonPMF(k, lambda) {
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}

function poisson1X2(lambdaHome, lambdaAway) {
  let pHome = 0, pDraw = 0, pAway = 0;
  for (let i = 0; i <= POISSON_K_MAX; i++) {
    const pHi = poissonPMF(i, lambdaHome);
    for (let j = 0; j <= POISSON_K_MAX; j++) {
      const pAj = poissonPMF(j, lambdaAway);
      const p = pHi * pAj;
      if (i > j) pHome += p;
      else if (i === j) pDraw += p;
      else pAway += p;
    }
  }
  const s = pHome + pDraw + pAway;
  return { home: pHome / s, draw: pDraw / s, away: pAway / s };
}

function shrinkToUniform(p, alpha) {
  const u = 1 / 3;
  return alpha * p + (1 - alpha) * u;
}

function safeProb(p) {
  if (!Number.isFinite(p)) return 1 / 3;
  if (p < EPS) return EPS;
  if (p > 1 - EPS) return 1 - EPS;
  return p;
}

function logit(p) {
  return Math.log(p / (1 - p));
}

// Market implied probs (remove vigorish)
function marketProbs(odds) {
  if (!odds || !odds.home || !odds.draw || !odds.away) return null;
  const qH = 1 / odds.home;
  const qD = 1 / odds.draw;
  const qA = 1 / odds.away;
  const s = qH + qD + qA;
  return {
    home: qH / s,
    draw: qD / s,
    away: qA / s
  };
}

// -----------------------------
// Load data
// -----------------------------
const leagueFolders = fs
  .readdirSync(DATA_ROOT, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

const allMatches = leagueFolders.flatMap(league => {
  const leaguePath = path.join(DATA_ROOT, league);
  return importLeagueSeasonFolder(leaguePath, league);
});

// -----------------------------
// Edge evaluation
// -----------------------------
function runEdgeEval(matches) {
  // stats per threshold
  const stats = {};
  for (const t of THRESHOLDS) {
    stats[t] = {
      bets: 0,
      wins: 0,
      profit: 0,
      oddsSum: 0,
      leagues: new Map()
    };
  }

  const total = matches.length;

  for (let i = 10; i < total; i++) {
    if (i % PROGRESS_EVERY === 0) {
      console.log(`Rolling progress: ${i} / ${total}`);
    }

    const train = matches.slice(0, i);
    const test = matches[i];
    if (!test) continue;

    // Require odds for betting eval
    const mkt = marketProbs(test.odds);
    if (!mkt) continue;

    const leagueId = test.league;
    if (!leagueId) continue;

    const teams = buildTeamStates(train);
    const prior = getLeaguePrior(leagueId);

    const home = teams.get(test.home);
    const away = teams.get(test.away);
    if (!home || !away) continue;

    const { lambdaHome, lambdaAway } = buildLambda(test, home, away, prior);
    if (!Number.isFinite(lambdaHome) || !Number.isFinite(lambdaAway)) continue;

    // Model probs (calibrated)
    const base = poisson1X2(lambdaHome, lambdaAway);
    const model = {
      home: safeProb(shrinkToUniform(base.home, ALPHA)),
      draw: safeProb(shrinkToUniform(base.draw, ALPHA)),
      away: safeProb(shrinkToUniform(base.away, ALPHA))
    };

    // Edge in logit space
    const edges = {
      home: logit(model.home) - logit(safeProb(mkt.home)),
      draw: logit(model.draw) - logit(safeProb(mkt.draw)),
      away: logit(model.away) - logit(safeProb(mkt.away))
    };

    // Pick max edge outcome
    let pick = "home";
    if (edges.draw > edges[pick]) pick = "draw";
    if (edges.away > edges[pick]) pick = "away";
    const edgeMax = edges[pick];

    // Actual outcome
    const hg = test.goalsHome;
    const ag = test.goalsAway;
    let outcome;
    if (hg > ag) outcome = "home";
    else if (hg < ag) outcome = "away";
    else outcome = "draw";

    // Evaluate per threshold
    for (const t of THRESHOLDS) {
      if (edgeMax < t) continue;

      const s = stats[t];
      s.bets += 1;

      const odds =
        pick === "home" ? test.odds.home :
        pick === "draw" ? test.odds.draw :
        test.odds.away;

      s.oddsSum += odds;

      if (pick === outcome) {
        s.wins += 1;
        s.profit += (odds - 1); // net win
      } else {
        s.profit -= 1; // stake lost
      }

      // league breakdown
      if (!s.leagues.has(leagueId)) {
        s.leagues.set(leagueId, { bets: 0, profit: 0 });
      }
      const L = s.leagues.get(leagueId);
      L.bets += 1;
      L.profit += (pick === outcome) ? (odds - 1) : -1;
    }
  }

  return stats;
}

// -----------------------------
// Run
// -----------------------------
console.log("Running EDGE ENGINE v1...");
console.log("Leagues found:", leagueFolders.length);
console.log("Total matches loaded:", allMatches.length);

const stats = runEdgeEval(allMatches);

// -----------------------------
// Report
// -----------------------------
console.log("=================================");
console.log("EDGE EVALUATION — THRESHOLD SWEEP");
console.log("tau | bets | hit% | avgOdds | ROI");
console.log("---------------------------------");

for (const t of THRESHOLDS) {
  const s = stats[t];
  if (s.bets === 0) {
    console.log(`${t.toFixed(2)} | 0 | - | - | -`);
    continue;
  }
  const hit = s.wins / s.bets;
  const avgOdds = s.oddsSum / s.bets;
  const roi = s.profit / s.bets;
  console.log(
    `${t.toFixed(2)} | ${s.bets} | ${(hit*100).toFixed(1)}% | ${avgOdds.toFixed(2)} | ${(roi*100).toFixed(2)}%`
  );
}

console.log("---------------------------------");
console.log("TOP LEAGUES BY ROI (min 50 bets)");

for (const t of THRESHOLDS) {
  const s = stats[t];
  const rows = [];
  for (const [lg, v] of s.leagues.entries()) {
    if (v.bets >= 50) {
      rows.push({ league: lg, bets: v.bets, roi: v.profit / v.bets });
    }
  }
  rows.sort((a,b) => b.roi - a.roi);
  console.log(`τ = ${t.toFixed(2)}`);
  rows.slice(0, 5).forEach(r => {
    console.log(`  ${r.league}: bets=${r.bets}, ROI=${(r.roi*100).toFixed(2)}%`);
  });
}

console.log("=================================");
