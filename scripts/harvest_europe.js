/**
 * AI MATCHLAB — EUROPE TEAMS HARVESTER
 * ------------------------------------
 * Διαβάζει το leagues_lookup.json
 * → φιλτράρει μόνο Ευρώπη
 * → για κάθε league (που δεν είναι Cup/Trophy/Super Cup)
 *    καλεί τον teams-harvester worker
 * → αποθηκεύει JSON στο:
 *    AI-MATCHLAB-DATA/teams/EUROPE/<COUNTRY>/<LEAGUE>.json
 */

import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// ⚙️ ΡΥΘΜΙΣΕ ΑΥΤΑ ΤΑ 2 ΜΟΝΟ ΑΝ ΧΡΕΙΑΣΤΕΙ
const DATA_ROOT = "AI-MATCHLAB-DATA"; // ρίζα του DATA repo σου
const LOOKUP_PATH = path.join(DATA_ROOT, "indexes", "leagues_lookup.json");

// Worker endpoint (ο worker v1.0 που σου έδωσα)
const HARVEST_ENDPOINT =
  "https://aimatchlab-teams-harvester.pierros1402.workers.dev/api/harvest/league";

// ------------------------------------------------------------
// Helper: μικρό delay (για retries)
// ------------------------------------------------------------
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ------------------------------------------------------------
// Helper: fetch με retries (1s, 3s, 7s)
// ------------------------------------------------------------
async function fetchWithRetries(url, maxRetries = 3) {
  const delays = [1000, 3000, 7000];
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.log(`   → Fetch attempt ${attempt + 1}/${maxRetries}`);
      const res = await fetch(url, {
        headers: {
          "User-Agent": "AIML-EuropeHarvester/1.0",
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        console.log(`   ❌ HTTP ${res.status}`);
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      return json;
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) {
        console.log("   ❌ Failed after retries:", err.message || err);
        return null;
      }
      await delay(delays[attempt - 1] || 3000);
    }
  }

  return null;
}

// ------------------------------------------------------------
// Δημιουργία φακέλου αν δεν υπάρχει
// ------------------------------------------------------------
function ensureDir(p) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

// ------------------------------------------------------------
// ΚΥΡΙΟ SCRIPT
// ------------------------------------------------------------
async function run() {
  console.log("🔵 Φόρτωση leagues_lookup.json από:", LOOKUP_PATH);

  if (!fs.existsSync(LOOKUP_PATH)) {
    console.error("❌ Δεν βρέθηκε το leagues_lookup.json. Τρέξε πρώτα το build_lookup.js!");
    process.exit(1);
  }

  const lookup = JSON.parse(fs.readFileSync(LOOKUP_PATH, "utf8"));
  const allLeagues = lookup.leagues || [];

  console.log(`🔍 Σύνολο λιγκών στο lookup: ${allLeagues.length}`);

  // Φιλτράρουμε: ΜΟΝΟ Ευρώπη
  const europeLeagues = allLeagues.filter((lg) =>
    (lg.region_cluster || "").startsWith("Europe")
  );

  console.log(`🌍 Λίγκες Ευρώπης: ${europeLeagues.length}`);

  // Εντοπισμός cups (να τα σκιπάρουμε)
  function isCupLike(name) {
    if (!name) return false;
    const n = name.toLowerCase();
    return (
      n.includes("cup") ||
      n.includes("trophy") ||
      n.includes("super cup") ||
      n.includes("supercup") ||
      n.includes("super-cup")
    );
  }

  // Loop σε όλες τις ευρωπαϊκές λίγκες
  for (const lg of europeLeagues) {
    const {
      league_id,
      display_name,
      country_code,
      country_name,
      tier,
      region_cluster,
      timezone,
      provider_data,
    } = lg;

    // Σκιπάρουμε cups / trophies κλπ
    if (isCupLike(display_name)) {
      console.log(`⚪ [SKIP CUP] ${league_id} — ${display_name}`);
      continue;
    }

    if (!provider_data || !provider_data.tournamentId || !provider_data.seasonId) {
      console.log(
        `⚠️ [SKIP MISSING IDs] ${league_id} — ${display_name} (no tournamentId/seasonId)`
      );
      continue;
    }

    const { tournamentId, seasonId } = provider_data;

    console.log(
      `\n⚽ [LEAGUE] ${league_id} — ${display_name} (${country_name}) | tId=${tournamentId}, sId=${seasonId}`
    );

    // Build query URL για τον worker
    const url =
      `${HARVEST_ENDPOINT}` +
      `?tournamentId=${encodeURIComponent(tournamentId)}` +
      `&seasonId=${encodeURIComponent(seasonId)}` +
      `&countryCode=${encodeURIComponent(country_code)}` +
      `&countryName=${encodeURIComponent(country_name)}` +
      `&leagueId=${encodeURIComponent(league_id)}`;

    console.log("   URL:", url);

    const result = await fetchWithRetries(url, 3);

    if (!result || result.error) {
      console.log(
        "   ❌ Αποτυχία harvesting:",
        result && result.error ? result.error : "null response"
      );
      continue;
    }

    const teams = result.teams || [];
    console.log(`   ✅ Λάβαμε ${teams.length} ομάδες`);

    // Φάκελος στόχος: AI-MATCHLAB-DATA/teams/EUROPE/COUNTRY_CODE/
    const countryDir = path.join(
      DATA_ROOT,
      "teams",
      "EUROPE",
      country_code
    );
    ensureDir(countryDir);

    const outPath = path.join(countryDir, `${league_id}.json`);

    const outData = {
      league_id,
      league_name: display_name,
      country_code,
      country_name,
      tier,
      region_cluster,
      timezone,
      harvest_meta: {
        provider: "sofascore",
        tournamentId,
        seasonId,
        harvested_at: result.harvested_at || new Date().toISOString(),
        source_url: result.source_url || null,
      },
      teams,
    };

    fs.writeFileSync(outPath, JSON.stringify(outData, null, 2), "utf8");
    console.log(`   💾 Αποθηκεύτηκε: ${outPath}`);
  }

  console.log("\n✅ HARVEST ΕΥΡΩΠΗΣ ΟΛΟΚΛΗΡΩΘΗΚΕ.");
}

run().catch((err) => {
  console.error("❌ Fatal error στο harvest_europe.js:", err);
  process.exit(1);
});
