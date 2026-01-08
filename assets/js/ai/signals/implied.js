// js/ai/signals/implied.js
export function impliedProb(odds) {
  if (!odds || odds <= 1) return null;
  return 1 / odds;
}
