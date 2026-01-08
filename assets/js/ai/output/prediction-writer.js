// js/ai/output/prediction-writer.js

import fs from "fs";
import path from "path";
import { buildPredictionRow } from "./schema.js";

const BASE_DIR = path.resolve("ai_predictions/v1");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function writePredictionsForDay(date, rows) {
  ensureDir(BASE_DIR);

  const filePath = path.join(BASE_DIR, `${date}.json`);

  const payload = {
    date,
    version: "v1",
    count: rows.length,
    predictions: rows
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
}
