// ai/core/league_priors.js
// Rolling-safe league priors

export const DEFAULT_LEAGUE_PRIOR = {
  muGoals: 2.6,
  homeAdv: 0.15,
  sigmaTeam: 0.35,
  lambdaFloor: 0.25
};

// Μπορείς να τα επεκτείνεις όποτε θέλεις
export const LEAGUE_PRIORS = {
  ENG1: { muGoals: 2.75, homeAdv: 0.15, sigmaTeam: 0.35, lambdaFloor: 0.25 },
  GER1: { muGoals: 2.95, homeAdv: 0.12, sigmaTeam: 0.35, lambdaFloor: 0.25 },
  ITA1: { muGoals: 2.55, homeAdv: 0.13, sigmaTeam: 0.35, lambdaFloor: 0.25 },
  SPA1: { muGoals: 2.6,  homeAdv: 0.14, sigmaTeam: 0.35, lambdaFloor: 0.25 },
  FRA1: { muGoals: 2.7,  homeAdv: 0.14, sigmaTeam: 0.35, lambdaFloor: 0.25 }
};

export function getLeaguePrior(leagueId) {
  return LEAGUE_PRIORS[leagueId] || DEFAULT_LEAGUE_PRIOR;
}
