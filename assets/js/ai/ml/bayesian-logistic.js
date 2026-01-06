// =====================================================
// Bayesian Logistic Correction (prob + uncertainty)
// File: assets/js/ai/ml/bayesian-logistic.js
// =====================================================

// ΣΗΜΕΙΩΣΗ:
// - Υλοποιεί Bayesian logistic update με priors.
// - Επιστρέφει probability + uncertainty (variance).
// - Fail-safe passthrough αν λείπουν priors.

// -----------------------------
// UTIL
// -----------------------------
function clamp(x, a = 0, b = 1) {
  return Math.max(a, Math.min(b, x));
}

// logistic
function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

// -----------------------------
// MAIN
// -----------------------------
/**
 * applyBayesianCorrection
 *
 * @param {number} baseProb - base probability (from Poisson or GBM)
 * @param {Object} features - feature vector
 * @param {Object|null} priors - Bayesian priors
 *
 * priors = {
 *   weights: { f1: mean, f2: mean, ... },
 *   variance: { f1: var, f2: var, ... },
 *   intercept: { mean, var }
 * }
 */
export function applyBayesianCorrection(baseProb, features, priors = null) {
  if (!priors || !priors.weights || !priors.intercept) {
    return {
      prob: clamp(baseProb),
      uncertainty: 1,
      source: "bayes:passthrough"
    };
  }

  let mean = priors.intercept.mean;
  let variance = priors.intercept.var;

  for (const [k, v] of Object.entries(features)) {
    if (priors.weights[k] !== undefined) {
      mean += priors.weights[k] * v;
      variance += priors.variance?.[k] ?? 0.1;
    }
  }

  // combine with base probability as prior
  const baseLogit = Math.log(
    clamp(baseProb, 1e-6, 1 - 1e-6) /
    (1 - clamp(baseProb, 1e-6, 1 - 1e-6))
  );

  const postMean = baseLogit + mean;
  const postProb = sigmoid(postMean);

  // uncertainty proxy (higher variance => lower confidence)
  const uncertainty = clamp(Math.sqrt(variance));

  return {
    prob: clamp(Number(postProb.toFixed(4))),
    uncertainty: Number(uncertainty.toFixed(3)),
    source: "bayes:corrected"
  };
}
