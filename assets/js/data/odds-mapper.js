export function mapOdds(raw) {
  if (!raw || !raw.response) return { bookmakers: [] };

  return {
    bookmakers: raw.response.map(b => ({
      name: b.bookmaker.name,
      markets: b.bookmaker.markets
    }))
  };
}
