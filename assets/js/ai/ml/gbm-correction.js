// =====================================================
// GBM Bias Correction (interface + safe runtime)
// File: assets/js/ai/ml/gbm-correction.js
// =====================================================

// ΣΗΜΕΙΩΣΗ:
// - Το αρχείο ορίζει καθαρό interface για GBM correction.
// - Υποστηρίζει φόρτωση pre-trained μοντέλου (JSON).
// - Αν δεν υπάρχει μοντέλο, κάνει passthrough.
// - Δεν εξαρτάται από UI/live.

// -----------------------------
// UTIL
// -----------------------------
function clamp(x, a = 0, b = 1) {
  return Math.max(a, Math.min(b, x));
}

// -----------------------------
// SIMPLE TREE EVAL (generic)
// -----------------------------
function evalTree(tree, features) {
  let node = tree;
  while (node && node.feature !== undefined) {
    const v = features[node.feature];
    node = (v <= node.threshold) ? node.left : node.right;
  }
  return node?.value ?? 0;
}

// -----------------------------
// MAIN CORRECTOR
// -----------------------------
/**
 * applyGBMCorrection
 *
 * @param {Object} probs - base probabilities from Poisson
 *   { homeWin, draw, awayWin, over25, btts }
 * @param {Object} features - engineered features
 * @param {Object|null} model - pre-trained GBM model (JSON)
 *
 * @returns {Object} corrected probabilities
 */
export function applyGBMCorrection(probs, features, model = null) {
  // Fail-safe passthrough
  if (!model || !model.trees || !model.learningRate) {
    return { ...probs, source: "gbm:passthrough" };
  }

  const out = { ...probs };

  // Για κάθε market έχουμε ξεχωριστό ensemble
  for (const market of Object.keys(model.trees)) {
    let score = 0;
    for (const tree of model.trees[market]) {
      score += evalTree(tree, features);
    }
    score *= model.learningRate;

    // logistic squashing γύρω από base prob
    const p0 = clamp(probs[market] ?? probs[`${market}Win`] ?? 0);
    const logit = Math.log(p0 / (1 - p0)) + score;
    const p = 1 / (1 + Math.exp(-logit));

    out[market] = clamp(Number(p.toFixed(4)));
  }

  out.source = "gbm:corrected";
  return out;
}
