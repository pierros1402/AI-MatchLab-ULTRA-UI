// js/ai/eval/logloss.js

const EPS = 1e-15;

export function logLossMulticlass(probs, outcomeIndex) {
  const p = Math.max(EPS, probs[outcomeIndex]);
  return -Math.log(p);
}

export function logLossBinary(p, outcome) {
  const prob = outcome === 1 ? p : 1 - p;
  return -Math.log(Math.max(EPS, prob));
}
