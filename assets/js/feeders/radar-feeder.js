// assets/js/feeders/radar-feeder.js

import { loadJSON, safeEmit } from "./feeder-utils.js";

const EVENTS_URL = "/odds_events/v1/events.json";

export async function runRadarFeeder() {
  const data = await loadJSON(EVENTS_URL);
  if (!data || !Array.isArray(data)) return;

  // Latest-first
  const items = [...data].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  safeEmit("radar:update", {
    source: "odds_events",
    items
  });
}
