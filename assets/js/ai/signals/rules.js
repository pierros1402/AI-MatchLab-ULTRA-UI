// js/ai/signals/rules.js

export const DEFAULT_RULES = {
  minDelta: 0.20,
  minEdge: 0.05
};

export function passRules({ delta, pAI, pImplied }, rules = DEFAULT_RULES) {
  if (Math.abs(delta) < rules.minDelta) return false;
  if (pAI === null || pImplied === null) return false;
  if (pAI - pImplied < rules.minEdge) return false;
  return true;
}
