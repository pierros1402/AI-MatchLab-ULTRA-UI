// ai/training/team_strengths.js
// Rolling-safe team strength manager (NO cold-start collapse)

import { initTeamState } from "../core/team_state.js";

export function buildTeamStates(matches) {
  const teams = new Map();

  function getTeam(id) {
    if (!teams.has(id)) {
      teams.set(id, initTeamState());
    }
    return teams.get(id);
  }

  for (const m of matches) {
    const home = getTeam(m.home);
    const away = getTeam(m.away);

    // Ενημέρωση match count ΠΡΩΤΑ
    home.matches += 1;
    away.matches += 1;

    // Απλό Poisson-consistent update (log-scale)
    const gh = m.goalsHome;
    const ga = m.goalsAway;

    if (Number.isFinite(gh) && Number.isFinite(ga)) {
      home.attack += Math.log((gh + 0.5) / 1.4);
      home.defense += Math.log((ga + 0.5) / 1.4);

      away.attack += Math.log((ga + 0.5) / 1.4);
      away.defense += Math.log((gh + 0.5) / 1.4);
    }
  }

  return teams;
}
