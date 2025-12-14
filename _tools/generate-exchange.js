/**
 * ================================================================
 * AI MATCHLAB ULTRA — BETFAIR EXCHANGE AUTO GENERATOR
 * ---------------------------------------------------------------
 * - Fetches demo exchange-like data from remote JSON
 * - Converts it to C-format required by odds-betfair.js
 * - Saves to: /assets/js/odds/betfair-exchange.json
 * - Runs every 60 seconds
 * - 100% local, legal, safe
 * ================================================================
 */

import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// === CONFIG ======================================================

// Source URL (Demo Exchange Snapshot)
const SOURCE_URL =
const SOURCE_URL =
  "https://aiml-exchange-feed.pierros1402.workers.dev/snapshot";


// Target save path (Your project)
const TARGET_FILE =
  "C:/Users/pierr/Desktop/ai-matchlab-ultra-ui/assets/js/odds/betfair-exchange.json";

// Update interval (ms)
const UPDATE_INTERVAL = 60 * 1000;

// ================================================================

async function fetchExchangeData() {
  try {
    console.log("\n[EXCHANGE GEN] Fetching remote snapshot...");

    const res = await fetch(SOURCE_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Remote feed returned non-200 status");

    const raw = await res.json();

    if (!raw.matches || !Array.isArray(raw.matches)) {
      throw new Error("Remote feed has invalid format — missing matches[]");
    }

    // Convert RAW DATA into C-FORMAT
    const converted = {
      matches: raw.matches.map(m => ({
        match_id: m.match_id || `${m.home}-${m.away}-${Date.now()}`,
        home: m.home || "Home",
        away: m.away || "Away",
        market: m.market || "Match Odds",
        commence_time: m.commence_time || null,

        back_home: m.back_home ?? null,
        lay_home: m.lay_home ?? null,
        back_draw: m.back_draw ?? null,
        lay_draw: m.lay_draw ?? null,
        back_away: m.back_away ?? null,
        lay_away: m.lay_away ?? null,

        liq_home: m.liq_home ?? 0,
        liq_draw: m.liq_draw ?? 0,
        liq_away: m.liq_away ?? 0
      }))
    };

    // Write to local JSON file
    fs.writeFileSync(
      TARGET_FILE,
      JSON.stringify(converted, null, 2),
      "utf8"
    );

    console.log(
      `[EXCHANGE GEN] Updated ${converted.matches.length} matches → betfair-exchange.json`
    );
  } catch (err) {
    console.error("[EXCHANGE GEN ERROR]", err);
  }
}

// ================================================================
// MAIN LOOP
// ================================================================

console.log("===============================================");
console.log("AI MATCHLAB ULTRA — Betfair Exchange Generator");
console.log("Starting auto-update every 60 seconds...");
console.log("Source:", SOURCE_URL);
console.log("Target:", TARGET_FILE);
console.log("===============================================");

fetchExchangeData();
setInterval(fetchExchangeData, UPDATE_INTERVAL);
