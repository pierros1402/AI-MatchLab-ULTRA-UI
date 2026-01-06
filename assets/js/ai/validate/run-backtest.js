// assets/js/ai/validate/run-backtest.js
// Phase 3C — Outcome-specific diagnostics (H / D / A)
// Baseline LOCKED; calibration alpha locked at 0.30
// FIX: remove runBacktest call (not needed for diagnostics)

import fs from "fs";
import path from "path";

import { importLeagueSeasonFolder } from "../data/csv-importer.js";
import { buildTeamStates } from "../team/team-strength.js";
import { getLeaguePrior } from "../core/league_priors.js";
import { buildLambda } from "../core/lambda_builder.js";

import ProbabilisticMetrics from "./probabilistic-metrics.js";

const DATA_ROOT = "./data/football-data";
const POISSON_K_MAX = 10;
const PROGRESS_EVERY = 5000;
const ALPHA = 0.30;
const EPS = 1e-15;

// --------------------------------------------------
// Helpers
// --------------------------------------------------
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

// --------------------------------------------------
// Load data
// --------------------------------------------------
const leagueFolders = fs
  .readdirSync(DATA_ROOT, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

const allMatches = leagueFolders.flatMap(league => {
  const leaguePath = path.join(DATA_ROOT, league);
  return importLeagueSeasonFolder(leaguePath, league);
});

// --------------------------------------------------
// Rolling diagnostics
// --------------------------------------------------
function runRollingBacktest(matches, metricsGlobal, llByOutcome) {
  const total = matches.length;

  for (let i = 10; i < total; i++) {
    if (i % PROGRESS_EVERY === 0) {
      console.log(`Rolling progress: ${i} / ${total}`);
    }

    const train = matches.slice(0, i);
    const test = matches[i];
    if (!test) continue;

    const leagueId = test.league;
    if (!leagueId) continue;

    const teams = buildTeamStates(train);
    const prior = getLeaguePrior(leagueId);

    const home = teams.get(test.home);
    const away = teams.get(test.away);
    if (!home || !away) continue;

    const { lambdaHome, lambdaAway } = buildLambda(test, home, away, prior);
    if (!Number.isFinite(lambdaHome) || !Number.isFinite(lambdaAway)) continue;

    const base = poisson1X2(lambdaHome, lambdaAway);

    const probs = {
      home: safeProb(shrinkToUniform(base.home, ALPHA)),
      draw: safeProb(shrinkToUniform(base.draw, ALPHA)),
      away: safeProb(shrinkToUniform(base.away, ALPHA))
    };

    const hg = test.goalsHome;
    const ag = test.goalsAway;
    let outcome;
    if (hg > ag) outcome = "H";
    else if (hg < ag) outcome = "A";
    else outcome = "D";

    metricsGlobal.addSample({
      league: leagueId,
      p_home: probs.home,
      p_draw: probs.draw,
      p_away: probs.away,
      outcome
    });

    if (outcome === "H") {
      llByOutcome.H.sum += -Math.log(probs.home);
      llByOutcome.H.n += 1;
    } else if (outcome === "D") {
      llByOutcome.D.sum += -Math.log(probs.draw);
      llByOutcome.D.n += 1;
    } else {
      llByOutcome.A.sum += -Math.log(probs.away);
      llByOutcome.A.n += 1;
    }
  }
}

// --------------------------------------------------
// Execution
// --------------------------------------------------
console.log("Running global rolling backtest (Outcome diagnostics)...");
console.log("Leagues found:", leagueFolders.length);
console.log("Total matches loaded:", allMatches.length);

const metricsGlobal = new ProbabilisticMetrics();
const llByOutcome = {
  H: { sum: 0, n: 0 },
  D: { sum: 0, n: 0 },
  A: { sum: 0, n: 0 }
};

runRollingBacktest(allMatches, metricsGlobal, llByOutcome);

const res = metricsGlobal.finalize();

console.log("=================================");
console.log("METRICS — GLOBAL (α=0.30)");
console.log("Samples:", res.global.samples);
console.log("Brier:", res.global.brier);
console.log("LogLoss:", res.global.logLoss);

console.log("---------------------------------");
console.log("OUTCOME-SPECIFIC LOGLOSS (α=0.30)");
console.log(`H: ${(llByOutcome.H.sum / llByOutcome.H.n).toFixed(6)} (n=${llByOutcome.H.n})`);
console.log(`D: ${(llByOutcome.D.sum / llByOutcome.D.n).toFixed(6)} (n=${llByOutcome.D.n})`);
console.log(`A: ${(llByOutcome.A.sum / llByOutcome.A.n).toFixed(6)} (n=${llByOutcome.A.n})`);
console.log("=================================");
