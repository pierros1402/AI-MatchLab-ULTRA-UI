// =====================================================
// Backtest & Validation Engine
// File: assets/js/ai/validate/backtest-engine.js
// =====================================================

// -----------------------------
// CONFIG
// -----------------------------
const DEFAULTS = {
  flatStake: 1,
  kellyFraction: 0.25,
  calibrationBins: 10
};

// -----------------------------
// UTILITIES
// -----------------------------
function clamp(x, a = 0, b = 1) {
  return Math.max(a, Math.min(b, x));
}

function impliedProb(odds) {
  return odds > 0 ? 1 / odds : 0;
}

function brier(prob, outcome) {
  return Math.pow(prob - outcome, 2);
}

function logLoss(prob, outcome) {
  const p = clamp(prob, 1e-6, 1 - 1e-6);
  return -(outcome * Math.log(p) + (1 - outcome) * Math.log(1 - p));
}

function kellyStake(prob, odds, bankroll, fraction) {
  const b = odds - 1;
  const q = 1 - prob;
  const f = (b * prob - q) / b;
  return clamp(f, 0, 1) * bankroll * fraction;
}

// -----------------------------
// CALIBRATION
// -----------------------------
function calibrationCurve(records, bins) {
  const buckets = Array.from({ length: bins }, () => ({
    count: 0,
    sumProb: 0,
    sumOutcome: 0
  }));

  for (const r of records) {
    const idx = Math.min(
      bins - 1,
      Math.floor(r.prob * bins)
    );
    buckets[idx].count++;
    buckets[idx].sumProb += r.prob;
    buckets[idx].sumOutcome += r.outcome;
  }

  return buckets.map((b, i) => ({
    bin: i,
    count: b.count,
    avgProb: b.count ? b.sumProb / b.count : 0,
    avgOutcome: b.count ? b.sumOutcome / b.count : 0
  }));
}

// -----------------------------
// MAIN BACKTEST
// -----------------------------
/**
 * runBacktest
 *
 * @param {Array} matches
 * Required fields:
 * {
 *   date,
 *   marketOdds: { home, draw, away },
 *   result: "H" | "D" | "A",
 *   prediction: { homeWin, draw, awayWin }
 * }
 *
 * @param {Object} options
 */
export function runBacktest(matches, options = {}) {
  const cfg = { ...DEFAULTS, ...options };

  let bankrollFlat = 0;
  let bankrollKelly = 0;

  const records = {
    home: [],
    draw: [],
    away: []
  };

  for (const m of matches) {
    const preds = m.prediction;
    const odds = m.marketOdds;

    const outcomes = {
      home: m.result === "H" ? 1 : 0,
      draw: m.result === "D" ? 1 : 0,
      away: m.result === "A" ? 1 : 0
    };

    for (const side of ["home", "draw", "away"]) {
      const prob = preds[`${side}Win`] ?? preds[side];
      if (!prob || !odds[side]) continue;

      const imp = impliedProb(odds[side]);
      const value = prob - imp;

      // --------- METRICS ---------
      records[side].push({
        prob,
        outcome: outcomes[side],
        odds: odds[side],
        value
      });

      // --------- FLAT STAKE ---------
      if (value > 0) {
        bankrollFlat +=
          outcomes[side] === 1
            ? cfg.flatStake * (odds[side] - 1)
            : -cfg.flatStake;
      }

      // --------- KELLY ---------
      if (value > 0) {
        const stake = kellyStake(
          prob,
          odds[side],
          1,
          cfg.kellyFraction
        );
        bankrollKelly +=
          outcomes[side] === 1
            ? stake * (odds[side] - 1)
            : -stake;
      }
    }
  }

  // -----------------------------
  // AGGREGATES
  // -----------------------------
  const summary = {};

  for (const side of ["home", "draw", "away"]) {
    const recs = records[side];
    if (!recs.length) continue;

    const brierScore =
      recs.reduce((s, r) => s + brier(r.prob, r.outcome), 0) /
      recs.length;

    const logLossScore =
      recs.reduce((s, r) => s + logLoss(r.prob, r.outcome), 0) /
      recs.length;

    summary[side] = {
      samples: recs.length,
      brier: Number(brierScore.toFixed(4)),
      logLoss: Number(logLossScore.toFixed(4)),
      calibration: calibrationCurve(
        recs.map(r => ({
          prob: r.prob,
          outcome: r.outcome
        })),
        cfg.calibrationBins
      )
    };
  }

  return {
    roi: {
      flat: Number(bankrollFlat.toFixed(2)),
      kelly: Number(bankrollKelly.toFixed(2))
    },
    summary
  };
}
