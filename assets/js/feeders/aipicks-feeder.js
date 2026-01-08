// assets/js/feeders/aipicks-feeder.js

import { todayISO, loadJSON, safeEmit } from "./feeder-utils.js";

export async function runAIPicksFeeder(date = todayISO()) {
  const url = `/signals/v1/${date}.json`;
  const data = await loadJSON(url);
  if (!data || !Array.isArray(data.signals)) return;

  // Strongest edge first
  const items = [...data.signals].sort((a, b) => b.edge - a.edge);

  safeEmit("aipicks:update", {
    source: "signals",
    date,
    rules: data.rules,
    items
  });
}
