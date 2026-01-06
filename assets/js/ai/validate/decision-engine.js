// =====================================================
// Decision / Value Engine
// File: assets/js/ai/validate/decision-engine.js
// =====================================================

/**
 * decideBets
 * Input: evaluated[] from backtest runner
 * Output: bets[] with flat & kelly stakes
 */
import { allowBet } from "./market-filter.js";

export function decideBets(evaluated, options = {}) {
  const cfg = {
    edgeMin: options.edgeMin ?? 0.05,     // 5% edge
    flatStake: options.flatStake ?? 1.0,  // unit stake
    kellyFrac: options.kellyFrac ?? 0.25, // fractional Kelly
    maxKelly: options.maxKelly ?? 0.05    // cap Kelly at 5% bankroll
  };

  const bets = [];

  for (const e of evaluated) {
    const { marketOdds, prediction, result } = e;
    if (!marketOdds || !prediction) continue;

    const markets = [
      { side: "home", p: prediction.homeWin, odd: marketOdds.home, res: result === "H" },
      { side: "draw", p: prediction.draw,    odd: marketOdds.draw, res: result === "D" },
      { side: "away", p: prediction.awayWin, odd: marketOdds.away, res: result === "A" }
    ];

    for (const m of markets) {
      if (!m.p || !m.odd || m.odd <= 1.01) continue;
      if (!allowBet(m.side, m.odd)) continue;
      const implied = 1 / m.odd;
      const edge = m.p - implied;

      if (edge < cfg.edgeMin) continue;

      // Flat stake
      const flatProfit = m.res ? (cfg.flatStake * (m.odd - 1)) : -cfg.flatStake;

      // Kelly fraction: f* = (bp - q) / b
      const b = m.odd - 1;
      const q = 1 - m.p;
      let kelly = ((b * m.p) - q) / b;
      kelly = Math.max(0, Math.min(kelly * cfg.kellyFrac, cfg.maxKelly));

      const kellyProfit = m.res ? (kelly * (m.odd - 1)) : -kelly;

      bets.push({
        date: e.date,
        side: m.side,
        p: m.p,
        odd: m.odd,
        implied,
        edge,
        flat: { stake: cfg.flatStake, profit: flatProfit },
        kelly: { stake: kelly, profit: kellyProfit }
      });
    }
  }

  return bets;
}

/**
 * summarizeBets
 */
export function summarizeBets(bets) {
  const sum = {
    count: bets.length,
    flat: { stake: 0, profit: 0 },
    kelly: { stake: 0, profit: 0 }
  };

  for (const b of bets) {
    sum.flat.stake += b.flat.stake;
    sum.flat.profit += b.flat.profit;
    sum.kelly.stake += b.kelly.stake;
    sum.kelly.profit += b.kelly.profit;
  }

  return sum;
}
