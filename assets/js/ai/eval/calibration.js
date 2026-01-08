// js/ai/eval/calibration.js

export function initBins(binSize = 0.05) {
  const bins = [];
  for (let p = 0; p < 1; p += binSize) {
    bins.push({
      from: p,
      to: p + binSize,
      count: 0,
      sumPred: 0,
      sumObs: 0
    });
  }
  return bins;
}

export function updateBin(bins, p, outcome) {
  const bin = bins.find(b => p >= b.from && p < b.to);
  if (!bin) return;
  bin.count += 1;
  bin.sumPred += p;
  bin.sumObs += outcome;
}

export function finalizeBins(bins) {
  return bins.map(b => ({
    range: `${b.from.toFixed(2)}–${b.to.toFixed(2)}`,
    count: b.count,
    meanPred: b.count ? b.sumPred / b.count : null,
    empirical: b.count ? b.sumObs / b.count : null
  }));
}
