// =====================================================
// Probability Calibrator (Platt + Isotonic)
// File: assets/js/ai/validate/probability-calibrator.js
// =====================================================

/**
 * We calibrate per market side (home/draw/away) independently.
 * Training uses (p_raw, y) pairs where y ∈ {0,1}.
 */

// -----------------------------
// Utilities
// -----------------------------
function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

// -----------------------------
// Platt Scaling (Logistic)
// -----------------------------
function trainPlatt(pairs, iters = 800, lr = 0.05) {
  // model: p_cal = sigmoid(a * logit(p_raw) + b)
  let a = 1.0, b = 0.0;

  for (let i = 0; i < iters; i++) {
    let da = 0, db = 0;
    for (const { p, y } of pairs) {
      const pr = clamp(p, 1e-6, 1 - 1e-6);
      const logit = Math.log(pr / (1 - pr));
      const z = a * logit + b;
      const pc = sigmoid(z);
      const err = pc - y;
      da += err * logit;
      db += err;
    }
    a -= lr * da / pairs.length;
    b -= lr * db / pairs.length;
  }

  return {
    type: "platt",
    a, b,
    apply: (p) => {
      const pr = clamp(p, 1e-6, 1 - 1e-6);
      const z = a * Math.log(pr / (1 - pr)) + b;
      return clamp(sigmoid(z), 1e-4, 1 - 1e-4);
    }
  };
}

// -----------------------------
// Isotonic (binning)
// -----------------------------
function trainIsotonic(pairs, bins = 20) {
  const sorted = [...pairs].sort((a, b) => a.p - b.p);
  const bucket = [];
  for (let i = 0; i < bins; i++) bucket.push({ n: 0, s: 0, lo: 0, hi: 0 });

  sorted.forEach((x, i) => {
    const k = Math.min(bins - 1, Math.floor((i / sorted.length) * bins));
    bucket[k].n += 1;
    bucket[k].s += x.y;
    bucket[k].lo = bucket[k].lo || x.p;
    bucket[k].hi = x.p;
  });

  const map = bucket
    .filter(b => b.n > 0)
    .map(b => ({
      lo: b.lo,
      hi: b.hi,
      v: b.s / b.n
    }));

  return {
    type: "isotonic",
    map,
    apply: (p) => {
      for (const m of map) {
        if (p >= m.lo && p <= m.hi) return clamp(m.v, 1e-4, 1 - 1e-4);
      }
      return clamp(p, 1e-4, 1 - 1e-4);
    }
  };
}

// -----------------------------
// Public API
// -----------------------------
export function trainCalibrator(evaluated, opts = {}) {
  const method = opts.method || "platt"; // "platt" | "isotonic"
  const minSamples = opts.minSamples || 400;

  // Build training pairs per side
  const sides = {
    home: [],
    draw: [],
    away: []
  };

  for (const e of evaluated) {
    if (!e.prediction || !e.result) continue;
    sides.home.push({ p: e.prediction.homeWin, y: e.result === "H" ? 1 : 0 });
    sides.draw.push({ p: e.prediction.draw,    y: e.result === "D" ? 1 : 0 });
    sides.away.push({ p: e.prediction.awayWin, y: e.result === "A" ? 1 : 0 });
  }

  const models = {};
  for (const side of Object.keys(sides)) {
    const pairs = sides[side].filter(x => x.p > 0 && x.p < 1);
    if (pairs.length < minSamples) {
      models[side] = { type: "identity", apply: (p) => p };
      continue;
    }
    models[side] =
      method === "isotonic"
        ? trainIsotonic(pairs, opts.bins || 20)
        : trainPlatt(pairs, opts.iters || 800, opts.lr || 0.05);
  }

  return {
    method,
    models,
    apply: (pred) => ({
      homeWin: models.home.apply(pred.homeWin),
      draw:    models.draw.apply(pred.draw),
      awayWin: models.away.apply(pred.awayWin)
    })
  };
}
