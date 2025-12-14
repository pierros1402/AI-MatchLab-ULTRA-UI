// ====================================================================
// MATCH DATA HUB — UNIFIED ENGINE (COMPLETE)
// ====================================================================
// Φορτώνει ΟΛΑ τα δεδομένα του αγώνα ΜΙΑ φορά
// Παράγει unified object
// Εκπέμπει hub events προς όλα τα panels
// ====================================================================

import { FormAPI } from "./form-api.js";
import { mapTeamForm } from "./form-mapper.js";

import { H2HAPI } from "./h2h-api.js";
import { mapH2H } from "./h2h-mapper.js";

import { getLeagueGoalAverage } from "./league-goals.js";
import { computeGoalStats } from "./goals-helper.js";

import { computeMatchProbabilities } from "./probability-model.js";
import { computeSharpOdds } from "./sharp-odds.js";

import { fairOdds, expectedValue } from "./ev-helper.js";


// Cache ανά match για σταθερότητα
const HUB_CACHE = {};


// ====================================================================
// MAIN EVENT: MATCH SELECTED
// ====================================================================
on("match-selected", async match => {
  const id = match.fixture_id;

  // Αν υπάρχει ήδη στο cache → στείλε αμέσως
  if (HUB_CACHE[id]) {
    emit("hub:ready", HUB_CACHE[id]);
    return;
  }

  emit("hub:loading", match);

  try {

    // =============================================================
    // 1) LOAD FORMS
    // =============================================================
    const rawHomeForm = await FormAPI.getTeamForm(match.home_id);
    const rawAwayForm = await FormAPI.getTeamForm(match.away_id);

    const homeForm = mapTeamForm(rawHomeForm, match.home_id);
    const awayForm = mapTeamForm(rawAwayForm, match.away_id);


    // =============================================================
    // 2) LOAD H2H
    // =============================================================
    const rawH2H = await H2HAPI.getH2H(match.home_id, match.away_id);
    const h2h = mapH2H(rawH2H, match.home_id, match.away_id);


    // =============================================================
    // 3) LEAGUE GOAL AVERAGE
    // =============================================================
    const leagueAvg = await getLeagueGoalAverage(match.league_id);


    // =============================================================
    // 4) GOAL MODEL (EXPECTANCY)
    // =============================================================
    const goalStats = computeGoalStats({
      homeForm,
      awayForm,
      h2h,
      leagueAvg
    });


    // =============================================================
    // 5) RATINGS (Temporary until Top Picks final module)
    // =============================================================
    const ratings = {
      home: 1,
      away: 1
    };


    // =============================================================
    // 6) PROBABILITIES (1X2 core model)
    // =============================================================
    const probabilities = computeMatchProbabilities(
      match,
      goalStats,
      ratings
    );


    // =============================================================
    // 7) SHARP ODDS (Pinnacle-like)
    // =============================================================
    const sharp = computeSharpOdds(probabilities);


    // =============================================================
    // 8) EV (Expected Value) — Soft odds έρχονται από άλλο event
    // =============================================================
    // Το EV δεν μπορεί να ολοκληρωθεί χωρίς soft odds.
    // Όταν φορτωθούν soft odds → odds-engine θα καλέσει updateEV().
    const ev = null;


    // =============================================================
    // 9) BUILD HUB OBJECT
    // =============================================================
    const HUB = {
      match,
      homeForm,
      awayForm,
      h2h,
      leagueAvg,
      goalStats,
      ratings,
      probabilities,
      sharp,
      ev,        // συμπληρώνεται όταν έρθουν τα odds
      updated: Date.now()
    };

    HUB_CACHE[id] = HUB;

    emit("hub:ready", HUB);

  } catch (err) {
    console.error("[HUB ERROR]", err);
    emit("hub:failure", err);
  }
});


// ====================================================================
// ODDS INJECTION — update EV and market when odds arrive
// ====================================================================
on("odds-loaded", ({ match, odds }) => {
  const id = match.fixture_id;
  const hub = HUB_CACHE[id];
  if (!hub) return;

  const soft = extractSoftOdds(odds);
  if (!soft) return;

  // Fair odds
  const fair = {
    home: fairOdds(hub.probabilities.home),
    draw: fairOdds(hub.probabilities.draw),
    away: fairOdds(hub.probabilities.away)
  };

  const ev = {
    home: expectedValue(fair.home, soft.home),
    draw: expectedValue(fair.draw, soft.draw),
    away: expectedValue(fair.away, soft.away)
  };

  // Update hub
  hub.ev = ev;
  hub.soft = soft;

  emit("hub:ready", hub);
});


// ====================================================================
// Extract soft odds
// ====================================================================
function extractSoftOdds(odds) {
  const bm = odds.bookmakers?.[0];
  if (!bm) return null;

  const m = bm.markets?.find(x => x.key === "h2h");
  if (!m) return null;

  return {
    home: m.outcomes[0].price,
    draw: m.outcomes[1].price,
    away: m.outcomes[2].price
  };
}
