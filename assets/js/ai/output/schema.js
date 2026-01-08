// js/ai/output/schema.js

export function buildPredictionRow({
  fixtureId,
  league,
  date,
  market,
  probabilities,
  meta = {}
}) {
  return {
    fixture_id: fixtureId,
    league,
    date,
    market,
    probabilities,
    meta,
    created_at: new Date().toISOString()
  };
}
