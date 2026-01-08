// js/ai/signals/join.js

import { impliedProb } from "./implied.js";
import { passRules } from "./rules.js";

function pickAIProbability(pred, selection) {
  if (!pred) return null;

  if (pred.market === "1X2") {
    if (selection === "Home") return pred.probabilities.home;
    if (selection === "Draw") return pred.probabilities.draw;
    if (selection === "Away") return pred.probabilities.away;
  }

  if (pred.market === "GG") {
    if (selection === "Yes") return pred.probabilities.yes;
    if (selection === "No") return pred.probabilities.no;
  }

  if (pred.market.startsWith("OU")) {
    if (selection === "Over") return pred.probabilities.over;
    if (selection === "Under") return pred.probabilities.under;
  }

  return null;
}

export function buildSignals({ predictions, events, rules }) {
  const predMap = new Map();
  predictions.forEach(p => {
    predMap.set(`${p.fixture_id}|${p.market}`, p);
  });

  const signals = [];

  events.forEach(ev => {
    const key = `${ev.fixture_id}|${ev.market}`;
    const pred = predMap.get(key);
    if (!pred) return;

    const pAI = pickAIProbability(pred, ev.selection);
    const pImpl = impliedProb(ev.current);

    if (!passRules({ delta: ev.delta, pAI, pImplied: pImpl }, rules)) return;

    signals.push({
      fixture_id: ev.fixture_id,
      league: pred.league,
      market: ev.market,
      selection: ev.selection,
      provider: ev.provider,
      opening: ev.opening,
      current: ev.current,
      delta: ev.delta,
      p_ai: pAI,
      p_implied: pImpl,
      edge: pAI - pImpl,
      timestamp: ev.timestamp
    });
  });

  return signals;
}
