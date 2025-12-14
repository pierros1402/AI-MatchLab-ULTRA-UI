export function mapRadar(raw) {
  if (!raw || !raw.response) return [];

  return raw.response.map(x => ({
    league_id: x.league.id,
    home: x.teams.home.name,
    away: x.teams.away.name,
    odds: x.bookmakers?.[0]?.bets?.[0]?.values || [],
    movement: "Significant shift"
  }));
}
