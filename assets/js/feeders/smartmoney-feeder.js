// assets/js/feeders/smartmoney-feeder.js

import { loadJSON, safeEmit } from "./feeder-utils.js";

const EVENTS_URL = "/odds_events/v1/events.json";

export async function runSmartMoneyFeeder() {
  const data = await loadJSON(EVENTS_URL);
  if (!data || !Array.isArray(data)) return;

  // Sort by absolute delta
  const items = [...data].sort(
    (a, b) => Math.abs(b.delta) - Math.abs(a.delta)
  );

  safeEmit("smartmoney:update", {
    source: "odds_events",
    items
  });
}
