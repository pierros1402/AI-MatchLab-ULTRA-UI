// ====================================================================
// Map Head-to-Head API to clean format
// ====================================================================

export function mapH2H(raw, homeId, awayId) {
  if (!raw || !raw.response) return [];

  return raw.response.map(m => {
    const isHome = m.teams.home.id === homeId;

    return {
      date: m.fixture.date,
      venue: m.fixture.venue?.name ?? "",
      home: m.teams.home.name,
      away: m.teams.away.name,
      gf: isHome ? m.goals.home : m.goals.away,
      ga: isHome ? m.goals.away : m.goals.home,
      result:
        m.goals.home > m.goals.away ? m.teams.home.name :
        m.goals.home < m.goals.away ? m.teams.away.name :
        "Draw"
    };
  });
}
