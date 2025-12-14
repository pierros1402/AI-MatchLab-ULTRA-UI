// ====================================================================
// League Goals Statistics
// ====================================================================

import { API } from "./api-core.js";

const LEAGUE_GOALS_CACHE = {};
const DAY = 24 * 60 * 60 * 1000;

export async function getLeagueGoalAverage(leagueId) {

  if (LEAGUE_GOALS_CACHE[leagueId] &&
      Date.now() - LEAGUE_GOALS_CACHE[leagueId].t < DAY) {
    return LEAGUE_GOALS_CACHE[leagueId].avg;
  }

  const fixtures = await API.getFixtures();
  const matches = fixtures.response.filter(f => f.league.id === leagueId);

  if (!matches.length) return 2.5;

  const totalGoals = matches.reduce(
    (s,m) => s + (m.goals.home ?? 0) + (m.goals.away ?? 0), 0
  );

  const avg = totalGoals / matches.length;

  LEAGUE_GOALS_CACHE[leagueId] = { t: Date.now(), avg };

  return avg;
}
