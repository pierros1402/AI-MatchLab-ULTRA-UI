export function mapFixtures(raw) {
  if (!raw || !raw.response) return [];

  return raw.response.map(f => ({
    match_id: f.fixture.id,
    league_id: f.league.id,
    date: f.fixture.date,
    status: f.fixture.status.short,
    minute: f.fixture.status.elapsed,
    home: f.teams.home.name,
    away: f.teams.away.name,
    score: {
      home: f.goals.home ?? 0,
      away: f.goals.away ?? 0
    }
  }));
}
