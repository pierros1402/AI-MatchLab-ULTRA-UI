// ai/core/lambda_builder.js
// Rolling-safe lambda construction

import { effectiveTeamStrength } from "./team_state.js";

export function buildLambda(match, homeTeam, awayTeam, leaguePrior) {
  const h = effectiveTeamStrength(homeTeam);
  const a = effectiveTeamStrength(awayTeam);

  const base = Math.log(leaguePrior.muGoals / 2);

  const logLambdaHome =
    base + h.attack - a.defense + leaguePrior.homeAdv;

  const logLambdaAway =
    base + a.attack - h.defense;

  let lambdaHome = Math.exp(logLambdaHome);
  let lambdaAway = Math.exp(logLambdaAway);

  lambdaHome = Math.max(lambdaHome, leaguePrior.lambdaFloor);
  lambdaAway = Math.max(lambdaAway, leaguePrior.lambdaFloor);

  return { lambdaHome, lambdaAway };
}
