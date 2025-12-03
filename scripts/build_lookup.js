/**
 * AI MATCHLAB — AUTO LEAGUE LOOKUP BUILDER
 * -----------------------------------------
 * Αυτό το script:
 * 1. Διαβάζει το global_leagues_master_FINAL.json
 * 2. Για κάθε league:
 *    - country info
 *    - display_name
 *    - tier
 * 3. Κάνει Sofascore Search μέσω PROXY:
 *    /api/v1/search/all?q=<league name>
 * 4. Βρίσκει το tournamentId
 * 5. Φέρνει seasons:
 *    /api/v1/unique-tournament/<tournamentId>/seasons
 * 6. Πιάνει το ΝΕΟΤΕΡΟ seasonId
 * 7. Το γράφει στο leagues_lookup.json
 */

import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const PROXY_BASE = "https://sofascore-proxy.pierros1402.workers.dev";

// ------------------------------------------------------------
// Load global_leagues_master_FINAL.json
// ------------------------------------------------------------
const globalPath = path.resolve("..", "AI-MATCHLAB-DATA", "indexes", "global_leagues_master_FINAL.json");
const lookupPath = path.resolve("..", "AI-MATCHLAB-DATA", "indexes", "leagues_lookup.json");

const globalData = JSON.parse(fs.readFileSync(globalPath, "utf8"));

// Collect all leagues
const leagues = [];

for (const country of globalData) {
  if (!country.leagues) continue;

  for (const league of country.leagues) {
    leagues.push({
      league_id: league.league_id,
      display_name: league.display_name,
      tier: league.tier || null,
      country_code: country.country_code,
      country_name: country.country_name,
      region_cluster: country.region_cluster,
      timezone: country.timezone
    });
  }
}

console.log(`Loaded ${leagues.length} leagues from global DB.`);

// ------------------------------------------------------------
// Helper: fetch JSON with proxy
// ------------------------------------------------------------
async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "AIML-LookupBuilder/1.0",
      "Accept": "application/json"
    }
  });

  if (!res.ok) {
    console.log("Fetch error:", url, res.status);
    return null;
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// Step-by-step build
// ------------------------------------------------------------
async function buildLookup() {
  const finalLeagues = [];

  for (const lg of leagues) {
    console.log(`\n🔍 Searching Sofascore for ${lg.display_name} (${lg.country_name})`);

    // 1. Search league by name
    const searchURL = `${PROXY_BASE}/api/v1/search/all?q=${encodeURIComponent(
      lg.display_name
    )}`;

    const searchData = await fetchJSON(searchURL);

    if (!searchData || !searchData.top || !searchData.top.tournaments) {
      console.log("❌ No tournaments in search result");
      continue;
    }

    // Find tournament matching name + country
    const found = searchData.top.tournaments.find(t =>
      t.name.toLowerCase().includes(lg.display_name.toLowerCase())
    );

    if (!found) {
      console.log("❌ No matching tournament found");
      continue;
    }

    const tournamentId = found.uniqueTournament.id;
    console.log("   ✓ tournamentId:", tournamentId);

    // 2. Fetch seasons
    const seasonsURL = `${PROXY_BASE}/api/v1/unique-tournament/${tournamentId}/seasons`;
    const seasonsData = await fetchJSON(seasonsURL);

    if (!seasonsData || !seasonsData.seasons || seasonsData.seasons.length === 0) {
      console.log("❌ Could not get seasons");
      continue;
    }

    // Latest season = season[0]
    const seasonId = seasonsData.seasons[0].id;
    console.log("   ✓ seasonId:", seasonId);

    // Build final record
    finalLeagues.push({
      ...lg,
      provider_data: {
        tournamentId,
        seasonId
      }
    });
  }

  console.log(`\n💾 Writing final leagues_lookup.json (${finalLeagues.length} leagues)...`);

  const output = {
    lookup_version: "1.0",
    provider: "sofascore",
    updated_at: new Date().toISOString(),
    leagues: finalLeagues
  };

  fs.writeFileSync(lookupPath, JSON.stringify(output, null, 2), "utf8");

  console.log(`\n✅ DONE! File saved → ${lookupPath}`);
}

// ------------------------------------------------------------
buildLookup();
