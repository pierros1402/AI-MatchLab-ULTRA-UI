// assets/js/ai/validate/rolling-backtest.js
// Rolling backtest – FOUNDATION CHECK ONLY
// (no Poisson, no DC, no metrics)

import { importLeagueSeasonFolder } from "../data/csv-importer.js";
import { buildTeamStates } from "../team/team-strength.js";
import { getLeaguePrior } from "../core/league_priors.js";
import { buildLambda } from "../core/lambda_builder.js";

const LEAGUE_ID = "ENG1";

// φορτώνουμε δεδομένα ΜΙΑ ΦΟΡΑ
const matches = importLeagueSeasonFolder(
  "./data/football-data/ENG1",
  LEAGUE_ID
);

async function runRolling() {
  console.log("Loading CSV data...");
  console.log("Total matches loaded:", matches.length);

  let evaluated = 0;

  for (let i = 10; i < matches.length; i++) {
    const train = matches.slice(0, i);
    const test = matches[i];

    const teams = buildTeamStates(train);
    const prior = getLeaguePrior(LEAGUE_ID);

    const home = teams.get(test.home);
    const away = teams.get(test.away);

    if (!home || !away) continue;

    const { lambdaHome, lambdaAway } =
      buildLambda(test, home, away, prior);

    // FOUNDATION CHECK: lambdas must be finite
    if (
      !Number.isFinite(lambdaHome) ||
      !Number.isFinite(lambdaAway)
    ) {
      continue;
    }

    evaluated++;
  }

  console.log("=================================");
  console.log("ROLLING FOUNDATION CHECK");
  console.log("League:", LEAGUE_ID);
  console.log("Samples:", evaluated);
}

runRolling().catch(err => {
  console.error("Fatal error in rolling backtest:");
  console.error(err);
});
