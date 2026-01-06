// =====================================================
// ENG1 End-to-End Backtest Runner
// File: assets/js/ai/validate/run-eng1-backtest.js
// =====================================================
import { importLeagueSeasonFolder } from "../data/csv-importer.js";
import { buildTeamStrengths } from "../team/team-strength.js";
import { dixonColesModel } from "../core/dixon-coles.js";
import { runBacktest } from "./backtest-engine.js";

import { trainCalibrator } from "./probability-calibrator.js";
import { decideBets, summarizeBets } from "./decision-engine.js";

// -----------------------------
// CONFIG
// -----------------------------
const CONFIG = {
  leagueId: "ENG1",
  csvFolder: "./data/football-data/ENG1", // φάκελος με τα CSV
  leagueAvgGoals: 1.35,
  rho: -0.08
};

// -----------------------------
// 1) LOAD MATCHES (CSV)
// -----------------------------
console.log("Loading CSV data...");
const matches = importLeagueSeasonFolder(CONFIG.csvFolder, CONFIG.leagueId);
console.log(`Loaded matches: ${matches.length}`);

// -----------------------------
// 2) BUILD TEAM STRENGTHS
// -----------------------------
console.log("Building team strengths...");
const teamRatings = buildTeamStrengths(matches);

// -----------------------------
// 3) BUILD PREDICTIONS
// -----------------------------
console.log("Running Dixon–Coles predictions...");
const evaluated = [];

for (const m of matches) {
  const home = teamRatings[m.home];
  const away = teamRatings[m.away];

  // fail-safe: αν λείπει ομάδα ή odds
  if (!home || !away) continue;
  if (!m.odds?.home || !m.odds?.draw || !m.odds?.away) continue;

  const dc = dixonColesModel({
    home,
    away,
    leagueAvgGoals: CONFIG.leagueAvgGoals,
    homeAdvantage: home.home_adv,
    rho: CONFIG.rho
  });

  evaluated.push({
    date: m.date,
    marketOdds: {
      home: m.odds.home,
      draw: m.odds.draw,
      away: m.odds.away
    },
    result:
      m.goalsHome > m.goalsAway ? "H" :
      m.goalsHome < m.goalsAway ? "A" : "D",
    prediction: {
      homeWin: dc.markets.homeWin,
      draw: dc.markets.draw,
      awayWin: dc.markets.awayWin
    }
  });
}

console.log(`Evaluated matches: ${evaluated.length}`);

// -----------------------------
// 4) RUN BACKTEST
// -----------------------------
console.log("Running backtest...");
const report = runBacktest(evaluated);
// -----------------------------
// 5) CALIBRATION (train & apply)
// -----------------------------
const calibrator = trainCalibrator(evaluated, {
  method: "platt",     // δοκίμασε "isotonic" αν θες
  minSamples: 500
});

// apply calibration
for (const e of evaluated) {
  e.prediction = calibrator.apply(e.prediction);
}

// -----------------------------
// 6) DECISION ENGINE
// -----------------------------
const bets = decideBets(evaluated, {
  edgeMin: 0.05,      // 5% edge
  flatStake: 1.0,
  kellyFrac: 0.25,
  maxKelly: 0.05
});

const betSummary = summarizeBets(bets);

console.log("---------------------------------");
console.log("BETS PLACED:", betSummary.count);
console.log("FLAT ROI:", betSummary.flat.profit);
console.log("KELLY ROI:", betSummary.kelly.profit);
console.log("---------------------------------");

// -----------------------------
// 5) OUTPUT
// -----------------------------
console.log("=================================");
console.log("ENG1 BACKTEST SUMMARY");
console.log("ROI (flat): ", report.roi.flat);
console.log("ROI (kelly):", report.roi.kelly);
console.log("---------------------------------");

for (const side of ["home", "draw", "away"]) {
  if (!report.summary[side]) continue;
  console.log(
    side.toUpperCase(),
    "Brier:", report.summary[side].brier,
    "LogLoss:", report.summary[side].logLoss,
    "Samples:", report.summary[side].samples
  );
}

console.log("=================================");
