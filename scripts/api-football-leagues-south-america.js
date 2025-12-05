/**
 * AI-MATCHLAB-DATA • API-FOOTBALL LEAGUES HARVESTER (South America)
 * -----------------------------------------------------------------
 * Τραβάει ΟΛΕΣ τις τρέχουσες λίγκες Νότιας Αμερικής από API-FOOTBALL
 * και γράφει:
 *
 *  - indexes/providers/api-football/leagues_south_america_raw.json
 *  - indexes/providers/api-football/leagues_south_america_index.json
 *
 * Δεν πειράζει τα δικά σου global_leagues_master / indexes.
 * Τα χρησιμοποιείς μετά για manual / semi-auto merge.
 */

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

// =====================================================
//  CONFIG
// =====================================================

const API_KEY = process.env.API_FOOTBALL_KEY;

if (!API_KEY) {
  console.error("❌ Missing env: API_FOOTBALL_KEY");
  process.exit(1);
}

const ROOT = __dirname.replace(/[/\\]tools$/, "");
const OUTPUT_DIR = path.join(
  ROOT,
  "indexes",
  "providers",
  "api-football"
);

const BASE_URL = "https://v3.football.api-sports.io/leagues";

// Νότια Αμερική — CONMEBOL countries
const SOUTH_AMERICA_COUNTRIES = [
  { code: "AR", name: "Argentina" },
  { code: "BR", name: "Brazil" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "EC", name: "Ecuador" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "UY", name: "Uruguay" },
  { code: "VE", name: "Venezuela" },
  { code: "BO", name: "Bolivia" }
];

// Προαιρετικά μπορείς να αλλάξεις season ή να το αφήσεις κενό
const TARGET_SEASON = new Date().getFullYear();

// =====================================================
//  HELPERS
// =====================================================

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function apiGetLeagues(params) {
  const url = new URL(BASE_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  });

  console.log(" → GET", url.toString());

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "x-apisports-key": API_KEY,
      "x-rapidapi-host": "v3.football.api-sports.io",
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.response || [];
}

// =====================================================
//  MAIN HARVEST
// =====================================================

async function harvestSouthAmerica() {
  ensureDir(OUTPUT_DIR);

  const rawByCountry = {};
  const indexEntries = [];

  for (const c of SOUTH_AMERICA_COUNTRIES) {
    console.log(`\n===== ${c.name} (${c.code}) =====`);

    try {
      const leagues = await apiGetLeagues({
        country: c.name,
        current: "true",
        season: TARGET_SEASON
      });

      rawByCountry[c.code] = {
        country_name: c.name,
        country_code: c.code,
        season: TARGET_SEASON,
        leagues
      };

      // Μικρό index για γρήγορο mapping μετά
      for (const item of leagues) {
        const l = item.league;
        const country = item.country;

        indexEntries.push({
          provider: "api-football",
          api_league_id: l.id,
          api_country_name: country?.name || c.name,
          api_country_code: country?.code || c.code,
          name: l.name,
          type: l.type,
          season: TARGET_SEASON,
          is_current: l.current || true
        });
      }

      console.log(
        ` ✔ ${c.name}: ${leagues.length} leagues (season ${TARGET_SEASON})`
      );
    } catch (err) {
      console.log(` ✖ Error for ${c.name}: ${err.message}`);
    }

    // Μικρή ανάσα για τα limits
    await new Promise((r) => setTimeout(r, 1200));
  }

  const rawPath = path.join(
    OUTPUT_DIR,
    "leagues_south_america_raw.json"
  );
  const idxPath = path.join(
    OUTPUT_DIR,
    "leagues_south_america_index.json"
  );

  fs.writeFileSync(rawPath, JSON.stringify(rawByCountry, null, 2), "utf8");
  fs.writeFileSync(idxPath, JSON.stringify(indexEntries, null, 2), "utf8");

  console.log("\n✅ DONE");
  console.log("   RAW  →", rawPath);
  console.log("   INDEX →", idxPath);
}

// Run
harvestSouthAmerica().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
