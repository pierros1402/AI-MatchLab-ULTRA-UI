// js/ai/eval/run-eval.js
import { buildResultsMap } from "./results-map.js";
import fs from "fs";
import path from "path";

import { brierScoreMulticlass, brierScoreBinary } from "./brier.js";
import { logLossMulticlass, logLossBinary } from "./logloss.js";
import { initBins, updateBin, finalizeBins } from "./calibration.js";

const PRED_DIR = path.resolve("ai_predictions/v1");
const RESULT_DIR = path.resolve("ai_eval/v1");

if (!fs.existsSync(RESULT_DIR)) fs.mkdirSync(RESULT_DIR, { recursive: true });

function loadPredictions() {
  const files = fs.readdirSync(PRED_DIR).filter(f => f.endsWith(".json"));
  let all = [];
  files.forEach(f => {
    const json = JSON.parse(fs.readFileSync(path.join(PRED_DIR, f), "utf-8"));
    all = all.concat(json.predictions);
  });
  return all;
}

// outcomeResolver: πρέπει να ταιριάξει με το RESULT FORMAT που έχεις
function resolveOutcome(pred, result) {
  if (!result) return null;

  if (pred.market === "1X2") {
    if (result.home > result.away) return 0;
    if (result.home === result.away) return 1;
    return 2;
  }

  if (pred.market === "GG") {
    return result.home > 0 && result.away > 0 ? 1 : 0;
  }

  if (pred.market.startsWith("OU")) {
    const line = Number(pred.market.replace("OU", "")) / 10;
    return result.home + result.away > line ? 1 : 0;
  }

  return null;
}

export function runEvaluation(resultsByFixtureId) {
  const predictions = loadPredictions();

  const metrics = {};
  const calibration = {};

  predictions.forEach(pred => {
    const result = resultsByFixtureId[pred.fixture_id];
    const outcome = resolveOutcome(pred, result);
    if (outcome === null) return;

    if (!metrics[pred.market]) {
      metrics[pred.market] = { brier: 0, logloss: 0, n: 0 };
      calibration[pred.market] = initBins();
    }

    if (pred.market === "1X2") {
      const probs = [
        pred.probabilities.home,
        pred.probabilities.draw,
        pred.probabilities.away
      ];
      metrics[pred.market].brier += brierScoreMulticlass(probs, outcome);
      metrics[pred.market].logloss += logLossMulticlass(probs, outcome);
    } else {
      const p =
        pred.probabilities.yes ??
        pred.probabilities.over ??
        pred.probabilities.home;

      metrics[pred.market].brier += brierScoreBinary(p, outcome);
      metrics[pred.market].logloss += logLossBinary(p, outcome);
      updateBin(calibration[pred.market], p, outcome);
    }

    metrics[pred.market].n += 1;
  });

  const output = {};
  Object.keys(metrics).forEach(market => {
    output[market] = {
      samples: metrics[market].n,
      brier: metrics[market].brier / metrics[market].n,
      logloss: metrics[market].logloss / metrics[market].n,
      calibration: finalizeBins(calibration[market])
    };
  });

  fs.writeFileSync(
    path.join(RESULT_DIR, "evaluation.json"),
    JSON.stringify(output, null, 2),
    "utf-8"
  );

  return output;
}
// =========================
// CLI RUN
// =========================

if (process.argv[1].includes("run-eval.js")) {
  const resultsByFixtureId = buildResultsMap();
  console.log("Results loaded:", Object.keys(resultsByFixtureId).length);

  const out = runEvaluation(resultsByFixtureId);
  console.log("Evaluation complete. Markets:", Object.keys(out));
}
