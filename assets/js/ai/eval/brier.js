// js/ai/eval/brier.js

export function brierScoreMulticlass(probs, outcomeIndex) {
  let score = 0;
  probs.forEach((p, i) => {
    const o = i === outcomeIndex ? 1 : 0;
    score += Math.pow(p - o, 2);
  });
  return score;
}

export function brierScoreBinary(p, outcome) {
  return Math.pow(p - outcome, 2);
}
