// assets/js/ai/validate/probabilistic-metrics.js
// Phase 1 — Probabilistic Metrics (LOCKED, HARD SAFE)

const EPS = 1e-15;
const CALIBRATION_BINS = 10;
const MIN_LEAGUE_SAMPLES = 500;

function clamp(p) {
  if (!Number.isFinite(p)) return 0.5;
  if (p < EPS) return EPS;
  if (p > 1 - EPS) return 1 - EPS;
  return p;
}

class ProbabilisticMetrics {
  constructor() {
    this.global = this._emptyBucket();
    this.byLeague = new Map();
  }

  _emptyBucket() {
    return {
      samples: 0,
      brierSum: 0,
      logLossSum: 0,
      calibration: {
        home: this._initBins(),
        draw: this._initBins(),
        away: this._initBins()
      }
    };
  }

  _initBins() {
    return Array.from({ length: CALIBRATION_BINS }, () => ({
      count: 0,
      sumP: 0,
      sumY: 0
    }));
  }

  _safeBin(cal, idx) {
    if (!cal[idx]) {
      // hard safety: should NEVER happen, but prevents crash
      cal[idx] = { count: 0, sumP: 0, sumY: 0 };
    }
    return cal[idx];
  }

  _getBinIndex(p) {
    if (!Number.isFinite(p)) return 0;
    let idx = Math.floor(p * CALIBRATION_BINS);
    if (idx < 0) idx = 0;
    if (idx >= CALIBRATION_BINS) idx = CALIBRATION_BINS - 1;
    return idx;
  }

  _updateCalibration(cal, p, y) {
    const idx = this._getBinIndex(p);
    const bin = this._safeBin(cal, idx);
    bin.count += 1;
    bin.sumP += p;
    bin.sumY += y;
  }

  _ensureLeague(league) {
    if (!this.byLeague.has(league)) {
      this.byLeague.set(league, this._emptyBucket());
    }
    return this.byLeague.get(league);
  }

  addSample({ league, p_home, p_draw, p_away, outcome }) {
    const ph = clamp(p_home);
    const pd = clamp(p_draw);
    const pa = clamp(p_away);

    const yh = outcome === "H" ? 1 : 0;
    const yd = outcome === "D" ? 1 : 0;
    const ya = outcome === "A" ? 1 : 0;

    const brier =
      (ph - yh) ** 2 +
      (pd - yd) ** 2 +
      (pa - ya) ** 2;

    const logLoss =
      -(
        yh * Math.log(ph) +
        yd * Math.log(pd) +
        ya * Math.log(pa)
      );

    this._accumulate(this.global, ph, pd, pa, yh, yd, ya, brier, logLoss);

    const bucket = this._ensureLeague(league);
    this._accumulate(bucket, ph, pd, pa, yh, yd, ya, brier, logLoss);
  }

  _accumulate(bucket, ph, pd, pa, yh, yd, ya, brier, logLoss) {
    bucket.samples += 1;
    bucket.brierSum += brier;
    bucket.logLossSum += logLoss;

    this._updateCalibration(bucket.calibration.home, ph, yh);
    this._updateCalibration(bucket.calibration.draw, pd, yd);
    this._updateCalibration(bucket.calibration.away, pa, ya);
  }

  _finalizeCalibration(cal) {
    return cal.map((b, i) => ({
      bin: i,
      range: [i / CALIBRATION_BINS, (i + 1) / CALIBRATION_BINS],
      samples: b.count,
      avgP: b.count > 0 ? b.sumP / b.count : 0,
      freq: b.count > 0 ? b.sumY / b.count : 0
    }));
  }

  _finalizeBucket(bucket) {
    return {
      samples: bucket.samples,
      brier: bucket.samples > 0 ? bucket.brierSum / bucket.samples : null,
      logLoss: bucket.samples > 0 ? bucket.logLossSum / bucket.samples : null,
      calibration: {
        home: this._finalizeCalibration(bucket.calibration.home),
        draw: this._finalizeCalibration(bucket.calibration.draw),
        away: this._finalizeCalibration(bucket.calibration.away)
      }
    };
  }

  finalize() {
    const global = this._finalizeBucket(this.global);

    const leagues = {};
    for (const [league, bucket] of this.byLeague.entries()) {
      if (bucket.samples >= MIN_LEAGUE_SAMPLES) {
        leagues[league] = this._finalizeBucket(bucket);
      }
    }

    return {
      global,
      leagues
    };
  }
}

export default ProbabilisticMetrics;
