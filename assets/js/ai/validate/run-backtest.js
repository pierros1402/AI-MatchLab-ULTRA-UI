// assets/js/ai/validate/run-backtest.js
// FIXTURES-BASED BACKTEST → ai_predictions/v1
// Baseline Poisson + league priors + team states
// LOCKED for evaluation phase

import fs from "fs";
import path from "path";

import { buildTeamStates } from "../core/team_state.js";
import { getLeaguePrior } from "../core/league_priors.js";
import { buildLambda } from "../core/lambda_builder.js";

// --------------------------------------------------
// PATHS
// --------------------------------------------------

const FIXTURES_ROOT = path.resolve(
  "odds-history-collector/fixtures/v1"
);

const OUT_DIR = path.resolve("ai_predictions/v1");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// --------------------------------------------------
// HELPERS
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
  let pH = 0, pD = 0, pA = 0;
  for (let i = 0; i <= 10; i++) {
    const pHi = poissonPMF(i, lambdaHome);
    for (let j = 0; j <= 10; j++) {
      const pAj = poissonPMF(j, lambdaAway);
      const p = pHi * pAj;
      if (i > j) pH += p;
      else if (i === j) pD += p;
      else pA += p;
    }
  }
  const s = pH + pD + pA;
  return { home: pH / s, draw: pD / s, away: pA / s };
}

// --------------------------------------------------
// LOAD FIXTURES
// --------------------------------------------------

function loadAllFixtures() {
  const matches = [];

  const leagues = fs.readdirSync(FIXTURES_ROOT);
  leagues.forEach(leagueDir => {
    const leaguePath = path.join(FIXTURES_ROOT, leagueDir);
    if (!fs.statSync(leaguePath).isDirectory()) return;

    const files = fs.readdirSync(leaguePath).filter(f => f.endsWith(".json"));
    files.forEach(file => {
      const data = JSON.parse(
        fs.readFileSync(path.join(leaguePath, file), "utf-8")
      );

      (data.matches || []).forEach(m => {
        // ---- ESPN-safe status extraction ----
        let statusName = "";
        let statusState = "";

        if (m.status && typeof m.status === "object") {
          if (m.status.type) {
            statusName = String(m.status.type.name || "").toUpperCase();
            statusState = String(m.status.type.state || "").toUpperCase();
          }
        } else {
          statusName = String(m.status || "").toUpperCase();
        }

        // ---- Canonical FT detection ----
        const IS_FT =
          statusName === "STATUS_FINAL" ||
          statusName === "FINAL" ||
          statusName === "FULL_TIME" ||
          statusState === "POST" ||
          statusState === "FINAL";

        if (!IS_FT) return;
        if (!m.id || m.scoreHome == null || m.scoreAway == null) return;

        matches.push({
          fixture_id: m.id,
          league: m.league,
          home: m.home,
          away: m.away,
          goalsHome: Number(m.scoreHome),
          goalsAway: Number(m.scoreAway)
        });
      });
    });
  });

  return matches;
}
// --------------------------------------------------
// BACKTEST
// --------------------------------------------------

console.log("Loading fixtures...");
const allMatches = loadAllFixtures();
console.log("Total FT matches:", allMatches.length);

const predictionsByDate = {};

for (let i = 10; i < allMatches.length; i++) {
  const train = allMatches.slice(0, i);
  const test = allMatches[i];

  const teams = buildTeamStates(train);
  const prior = getLeaguePrior(test.league);

  const home = teams.get(test.home);
  const away = teams.get(test.away);
  if (!home || !away) continue;

  const { lambdaHome, lambdaAway } =
    buildLambda(test, home, away, prior);

  if (!Number.isFinite(lambdaHome) || !Number.isFinite(lambdaAway)) continue;

  const probs = poisson1X2(lambdaHome, lambdaAway);

  const dateKey = "GLOBAL"; // simple baseline
  if (!predictionsByDate[dateKey]) {
    predictionsByDate[dateKey] = [];
  }

  predictionsByDate[dateKey].push({
    fixture_id: test.fixture_id,
    league: test.league,
    market: "1X2",
    probabilities: probs
  });
}

// --------------------------------------------------
// WRITE OUTPUT
// --------------------------------------------------

Object.keys(predictionsByDate).forEach(dateKey => {
  const out = {
    date: dateKey,
    predictions: predictionsByDate[dateKey]
  };

  const outFile = path.join(OUT_DIR, `${dateKey}.json`);
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2), "utf-8");
});

console.log("AI predictions written to ai_predictions/v1/");
