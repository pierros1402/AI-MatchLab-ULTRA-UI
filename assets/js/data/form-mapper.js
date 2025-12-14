// ====================================================================
// Converts API-Football last-5 fixtures to structured form data.
// ====================================================================

export function mapTeamForm(raw, teamId) {
  if (!raw || !raw.response) return [];

  return raw.response.map(m => {
    const home = m.teams.home.id === teamId;
    const goalsFor = home ? m.goals.home : m.goals.away;
    const goalsAgainst = home ? m.goals.away : m.goals.home;

    const outcome =
      goalsFor > goalsAgainst ? "W" :
      goalsFor < goalsAgainst ? "L" : "D";

    return {
      opponent: home ? m.teams.away.name : m.teams.home.name,
      gf: goalsFor,
      ga: goalsAgainst,
      outcome: outcome,
      date: m.fixture.date
    };
  });
}
