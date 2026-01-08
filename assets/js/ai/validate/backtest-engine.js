/**
 * AI MatchLab ULTRA
 * Backtest Engine – LOCKED BASELINE
 *
 * Responsibilities:
 * - Run rolling backtest
 * - Compute AI probabilities (Poisson / DC)
 * - Collect canonical AI predictions
 * - Write daily prediction snapshots
 *
 * DOES NOT:
 * - Touch UI
 * - Touch odds
 * - Make decisions
 * - Compute ROI
 */

import fs from "fs";
import path from "path";

import { buildLambdas } from "../core/lambda_builder.js";
import { compute1X2 } from "../core/poisson.js";
import { computeGG } from "../core/btts.js";
import { computeOU } from "../core/over_under.js";

import { buildPredictionRow } from "../output/schema.js";
import { writePredictionsForDay } from "../output/prediction-writer.js";

/* ------------------------------------------------------------------ */
/* Internal state                                                      */
/* ------------------------------------------------------------------ */

let currentDate = null;
let predictionBuffer = [];

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function ensureDate(date) {
  if (currentDate === null) {
    currentDate = date;
    return;
  }

  if (currentDate !== date) {
    finalizeDay(currentDate);
    currentDate = date;
  }
}

function collectPrediction({ fixture, market, probabilities }) {
  predictionBuffer.push(
    buildPredictionRow({
      fixtureId: fixture.id,
      league: fixture.league,
      date: fixture.date,
      market,
      probabilities,
      meta: {
        home: fixture.home,
        away: fixture.away
      }
    })
  );
}

/* ------------------------------------------------------------------ */
/* Core processing                                                     */
/* ------------------------------------------------------------------ */

export function processFixture(fixture, context) {
  /**
   * fixture:
   * {
   *   id,
   *   league,
   *   date,
   *   home,
   *   away,
   *   kickoff_ts,
   *   result   // optional (for validation only)
   * }
   */

  ensureDate(fixture.date);

  /* -------------------------------------------------------------- */
  /* Build lambdas                                                  */
  /* -------------------------------------------------------------- */

  const { lambdaHome, lambdaAway } = buildLambdas({
    fixture,
    context
  });

  /* -------------------------------------------------------------- */
  /* 1X2 probabilities                                             */
  /* -------------------------------------------------------------- */

  const p1X2 = compute1X2(lambdaHome, lambdaAway);

  collectPrediction({
    fixture,
    market: "1X2",
    probabilities: {
      home: p1X2.home,
      draw: p1X2.draw,
      away: p1X2.away
    }
  });

  /* -------------------------------------------------------------- */
  /* GG / NG                                                        */
  /* -------------------------------------------------------------- */

  const pGG = computeGG(lambdaHome, lambdaAway);

  collectPrediction({
    fixture,
    market: "GG",
    probabilities: {
      yes: pGG,
      no: 1 - pGG
    }
  });

  /* -------------------------------------------------------------- */
  /* Over / Under                                                   */
  /* -------------------------------------------------------------- */

  const ouLines = [1.5, 2.5, 3.5];

  ouLines.forEach((line) => {
    const pOver = computeOU(lambdaHome, lambdaAway, line);

    collectPrediction({
      fixture,
      market: `OU${String(line).replace(".", "")}`,
      probabilities: {
        over: pOver,
        under: 1 - pOver
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* Finalization                                                       */
/* ------------------------------------------------------------------ */

export function finalizeDay(date) {
  if (!predictionBuffer.length) return;

  writePredictionsForDay(date, predictionBuffer);
  predictionBuffer = [];
}

/* ------------------------------------------------------------------ */
/* Full run helper (optional)                                         */
/* ------------------------------------------------------------------ */

export function runBacktest(fixtures, context) {
  fixtures.forEach((fixture) => {
    processFixture(fixture, context);
  });

  if (currentDate) {
    finalizeDay(currentDate);
    currentDate = null;
  }
}
