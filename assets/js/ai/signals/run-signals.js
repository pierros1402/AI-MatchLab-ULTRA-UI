// js/ai/signals/run-signals.js

import fs from "fs";
import path from "path";
import { buildSignals } from "./join.js";
import { DEFAULT_RULES } from "./rules.js";

const PRED_DIR = path.resolve("ai_predictions/v1");
const EVENTS_DIR = path.resolve("odds_events/v1");
const OUT_DIR = path.resolve("signals/v1");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function loadPredictionsForDate(date) {
  const p = path.join(PRED_DIR, `${date}.json`);
  if (!fs.existsSync(p)) return [];
  const json = JSON.parse(fs.readFileSync(p, "utf-8"));
  return json.predictions || [];
}

function loadEvents() {
  const p = path.join(EVENTS_DIR, "events.json");
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

export function runSignalsForDate(date, rules = DEFAULT_RULES) {
  const predictions = loadPredictionsForDate(date);
  const events = loadEvents().filter(e => e.timestamp.startsWith(date));

  const signals = buildSignals({ predictions, events, rules });

  const out = {
    date,
    version: "v1",
    rules,
    count: signals.length,
    signals
  };

  fs.writeFileSync(
    path.join(OUT_DIR, `${date}.json`),
    JSON.stringify(out, null, 2),
    "utf-8"
  );

  return out;
}
