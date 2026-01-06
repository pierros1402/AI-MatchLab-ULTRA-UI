// assets/js/ai/validate/run-cae-congestion.js
// Contextual Asymmetry Engine v1 — Phase 2 (SCHEDULE CONGESTION)
// Locked model, locked calibration (alpha=0.30)
// Bets only when:
//   edge_model_vs_market >= tau
//   AND congestion asymmetry satisfied
// Draw bets explicitly excluded.

import fs from "fs";
import path from "path";

import { importLeagueSeasonFolder } from "../data/csv-importer.js";
import { buildTeamStates } from "../team/team-strength.js";
import { getLeaguePrior } from "../core/league_priors.js";
import { buildLambda } from "../core/lambda_builder.js";

// -----------------------------
// CONFIG (LOCKED)
// -----------------------------
const DATA_ROOT = "./data/football-data";
const POISSON_K_MAX = 10;
const PROGRESS_EVERY = 5000;

// Calibration (LOCKED)
const ALPHA = 0.30;

// Edge thresholds
const THRESHOLDS = [0.05, 0.10, 0.15, 0.20, 0.25];

const EPS = 1e-15;
const DAY_MS = 24 * 60 * 60 * 1000;

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

function shrink(p, alpha) {
  return alpha * p + (1 - alpha) / 3;
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

// Market implied probs (vig removed)
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
// Date helpers
// -----------------------------
function parseDateUTC(dateStr) {
  const parts = dateStr.split("-");
  let y = parts[0];
  if (y.length === 2) y = "20" + y;
  return Date.UTC(+y, +parts[1] - 1, +parts[2]);
}

// -----------------------------
// Congestion helpers
// -----------------------------
function congestionScore(team, train, testTime) {
  let cnt7 = 0;
  let cnt14 = 0;

  for (let i = train.length - 1; i >= 0; i--) {
    const m = train[i];
    if (m.home !== team && m.away !== team) continue;

    const t = parseDateUTC(m.date);
    const diffDays = (testTime - t) / DAY_MS;
    if (diffDays < 0) break;

    if (diffDays <= 7) cnt7++;
    if (diffDays <= 14) cnt14++;
    if (diffDays > 14) break;
  }

  if (cnt14 === 0) return null;
  return cnt7 + 0.5 * cnt14;
}

function congestionBucket(delta) {
  if (delta >= 2.0) return 2;
  if (delta >= 1.0) return 1;
  if (delta <= -2.0) return -2;
  if (delta <= -1.0) return -1;
  return 0;
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
// CAE Congestion Evaluation
// -----------------------------
function runCAE(matches) {
  const stats = {};
  for (const t of THRESHOLDS) {
    stats[t] = { bets: 0, wins: 0, profit: 0, oddsSum: 0 };
  }

  const total = matches.length;

  for (let i = 10; i < total; i++) {
    if (i % PROGRESS_EVERY === 0) {
      console.log(`Rolling progress: ${i} / ${total}`);
    }

    const train = matches.slice(0, i);
    const test = matches[i];
    if (!test) continue;

    const mkt = marketProbs(test.odds);
    if (!mkt) continue;

    const testTime = parseDateUTC(test.date);

    const congHome = congestionScore(test.home, train, testTime);
    const congAway = congestionScore(test.away, train, testTime);
    if (congHome === null || congAway === null) continue;

    const deltaCong = congHome - congAway;
    const context = congestionBucket(deltaCong);
    if (context === 0) continue;

    const teams = buildTeamStates(train);
    const prior = getLeaguePrior(test.league);
    const home = teams.get(test.home);
    const away = teams.get(test.away);
    if (!home || !away) continue;

    const { lambdaHome, lambdaAway } = buildLambda(test, home, away, prior);
    if (!Number.isFinite(lambdaHome) || !Number.isFinite(lambdaAway)) continue;

    const base = poisson1X2(lambdaHome, lambdaAway);
    const model = {
      home: safeProb(shrink(base.home, ALPHA)),
      away: safeProb(shrink(base.away, ALPHA))
    };

    const edges = {
      home: logit(model.home) - logit(safeProb(mkt.home)),
      away: logit(model.away) - logit(safeProb(mkt.away))
    };

    const outcome =
      test.goalsHome > test.goalsAway ? "home" :
      test.goalsHome < test.goalsAway ? "away" :
      "draw";

    for (const t of THRESHOLDS) {
      let pick = null;

      if (context <= -1 && edges.home >= t) pick = "home";
      if (context >= 1 && edges.away >= t) pick = "away";
      if (!pick) continue;

      const s = stats[t];
      s.bets += 1;

      const odds = pick === "home" ? test.odds.home : test.odds.away;
      s.oddsSum += odds;

      if (pick === outcome) {
        s.wins += 1;
        s.profit += (odds - 1);
      } else {
        s.profit -= 1;
      }
    }
  }

  return stats;
}

// -----------------------------
// Run
// -----------------------------
console.log("Running CAE v1 — SCHEDULE CONGESTION");
console.log("Leagues found:", leagueFolders.length);
console.log("Total matches loaded:", allMatches.length);

const stats = runCAE(allMatches);

// -----------------------------
// Report
// -----------------------------
console.log("=================================");
console.log("CAE CONGESTION — THRESHOLD SWEEP");
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
    `${t.toFixed(2)} | ${s.bets} | ${(hit * 100).toFixed(1)}% | ${avgOdds.toFixed(2)} | ${(roi * 100).toFixed(2)}%`
  );
}

console.log("=================================");
