// assets/js/ai/validate/run-cae-rest.js
// Contextual Asymmetry Engine v1 — Phase 1 (REST ASYMMETRY)
// Locked infra, locked model, locked calibration (alpha=0.30)
// Bets only when:
//   edge_model_vs_market >= tau
//   AND rest asymmetry context satisfied
// Draw bets are explicitly excluded.

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

// Context threshold (LOCKED for Phase 1)
const CONTEXT_C = 1; // requires at least +2 days rest advantage

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
// Rest Asymmetry helpers
// -----------------------------
function parseDateUTC(dateStr) {
  // supports YYYY-MM-DD or YY-MM-DD variants already used in dataset
  const parts = dateStr.split("-");
  let y = parts[0];
  if (y.length === 2) y = "20" + y;
  return Date.UTC(+y, +parts[1] - 1, +parts[2]);
}

function restBucket(delta) {
  if (delta >= 3) return 2;
  if (delta === 2) return 1;
  if (delta <= -3) return -2;
  if (delta === -2) return -1;
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
// CAE Rest Evaluation
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

    // odds required
    const mkt = marketProbs(test.odds);
    if (!mkt) continue;

    // dates
    const testTime = parseDateUTC(test.date);

    // last match dates
    let lastHome = null;
    let lastAway = null;

    for (let j = train.length - 1; j >= 0; j--) {
      const m = train[j];
      if (!lastHome && (m.home === test.home || m.away === test.home)) {
        lastHome = parseDateUTC(m.date);
      }
      if (!lastAway && (m.home === test.away || m.away === test.away)) {
        lastAway = parseDateUTC(m.date);
      }
      if (lastHome && lastAway) break;
    }

    if (!lastHome || !lastAway) continue;

    const restHome = Math.floor((testTime - lastHome) / DAY_MS);
    const restAway = Math.floor((testTime - lastAway) / DAY_MS);
    const deltaRest = restHome - restAway;
    const context = restBucket(deltaRest);

    // build model
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
      draw: safeProb(shrink(base.draw, ALPHA)),
      away: safeProb(shrink(base.away, ALPHA))
    };

    const edges = {
      home: logit(model.home) - logit(safeProb(mkt.home)),
      away: logit(model.away) - logit(safeProb(mkt.away))
    };

    // actual outcome
    const outcome =
      test.goalsHome > test.goalsAway ? "home" :
      test.goalsHome < test.goalsAway ? "away" :
      "draw";

    // evaluate thresholds
    for (const t of THRESHOLDS) {
      let pick = null;

      if (context >= CONTEXT_C && edges.home >= t) pick = "home";
      if (context <= -CONTEXT_C && edges.away >= t) pick = "away";

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
console.log("Running CAE v1 — REST ASYMMETRY");
console.log("Leagues found:", leagueFolders.length);
console.log("Total matches loaded:", allMatches.length);

const stats = runCAE(allMatches);

// -----------------------------
// Report
// -----------------------------
console.log("=================================");
console.log("CAE REST — THRESHOLD SWEEP");
console.log("tau | C | bets | hit% | avgOdds | ROI");
console.log("---------------------------------");

for (const t of THRESHOLDS) {
  const s = stats[t];
  if (s.bets === 0) {
    console.log(`${t.toFixed(2)} | ${CONTEXT_C} | 0 | - | - | -`);
    continue;
  }
  const hit = s.wins / s.bets;
  const avgOdds = s.oddsSum / s.bets;
  const roi = s.profit / s.bets;
  console.log(
    `${t.toFixed(2)} | ${CONTEXT_C} | ${s.bets} | ${(hit*100).toFixed(1)}% | ${avgOdds.toFixed(2)} | ${(roi*100).toFixed(2)}%`
  );
}

console.log("=================================");
