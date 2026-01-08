// ai/core/team_state.js
// Cold-start safe team state

export function initTeamState() {
  return {
    attack: 0.0,   // log-scale
    defense: 0.0,  // log-scale
    matches: 0
  };
}

export function shrinkageWeight(nMatches, k = 8) {
  return nMatches / (nMatches + k);
}

export function effectiveTeamStrength(teamState) {
  const w = shrinkageWeight(teamState.matches);
  return {
    attack: w * teamState.attack,
    defense: w * teamState.defense
  };
}
// ---------------------------------------------
// CANONICAL EXPORT (for backtest / evaluation)
// ---------------------------------------------

export function buildTeamStates(matches) {
  // αν υπάρχει ήδη function, απλώς την καλούμε
  if (typeof initTeamStates === "function") {
    return initTeamStates(matches);
  }

  if (typeof computeTeamStates === "function") {
    return computeTeamStates(matches);
  }

  throw new Error(
    "No team state builder found. Expected initTeamStates or computeTeamStates."
  );
}
