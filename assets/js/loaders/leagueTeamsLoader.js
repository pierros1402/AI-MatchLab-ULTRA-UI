// assets/js/ui/loaders/leagueTeamsLoader.js

let TEAMS_BY_LEAGUE = null;
let TEAMS_INDEX = null;

async function loadData() {
  if (!TEAMS_BY_LEAGUE) {
    TEAMS_BY_LEAGUE = await fetch("/AI-MATCHLAB-DATA/TEAMS/teams_by_league.json").then(r => r.json());
  }

  if (!TEAMS_INDEX) {
    TEAMS_INDEX = await fetch("/AI-MATCHLAB-DATA/TEAMS/teams_global_index.json").then(r => r.json());
  }
}

export async function getTeamsForLeague(leagueId) {
  await loadData();

  const entry = TEAMS_BY_LEAGUE[leagueId];
  if (!entry) return [];

  return entry.teams
    .map(id => ({
      id,
      name: TEAMS_INDEX[id]?.name || "Unknown"
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
