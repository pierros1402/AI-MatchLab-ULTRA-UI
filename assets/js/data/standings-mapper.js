export function mapStandings(raw) {
  if (!raw || !raw.response) return [];

  const table = raw.response[0].league.standings[0];

  return table.map(t => ({
    rank: t.rank,
    name: t.team.name,
    logo: t.team.logo,
    played: t.all.played,
    points: t.points
  }));
}
