// tools/build_teams.js
// ======================================================
// AI-MATCHLAB-DATA TEAM GENERATOR (Option Δ combined)
// - Διαβάζει master/teams_master.json
// - Γεννά:
//   1) /europe/teams/XX/LEAGUE_ID.json
//   2) /indexes/teams_global_database.json
//   3) /indexes/leagues_index.json (με paths)
// ======================================================

const fs = require("fs");
const path = require("path");

const ROOT = __dirname + "/..";
const MASTER_FILE = path.join(ROOT, "master", "teams_master.json");
const INDEXES_DIR = path.join(ROOT, "indexes");

const GLOBAL_TEAMS_DB = path.join(INDEXES_DIR, "teams_global_database.json");
const LEAGUES_INDEX_FILE = path.join(INDEXES_DIR, "leagues_index.json");

function ensureDir(p) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

function main() {
  console.log("🔧 AI-MATCHLAB-DATA — build_teams.js");

  if (!fs.existsSync(MASTER_FILE)) {
    console.error("❌ Δεν βρέθηκε master/teams_master.json");
    process.exit(1);
  }

  const master = JSON.parse(fs.readFileSync(MASTER_FILE, "utf8"));

  const teamsGlobal = { teams_by_league: {} };
  const leaguesIndex = { leagues: {} };

  Object.entries(master).forEach(([leagueId, meta]) => {
    const continentFolder = meta.continent_folder || "europe";
    const countryCode = meta.country_code;
    const leagueName = meta.league_name || leagueId;
    const teams = Array.isArray(meta.teams) ? meta.teams : [];

    if (!countryCode) {
      console.warn(`⚠️ League ${leagueId} δεν έχει country_code, skip`);
      return;
    }

    // 1) Γεννά per-league file
    const teamsDir = path.join(ROOT, continentFolder, "teams", countryCode);
    ensureDir(teamsDir);

    const leagueTeamsFile = path.join(teamsDir, `${leagueId}.json`);
    const leagueTeamsData = {
      league_id: leagueId,
      country_code: countryCode,
      country_name: meta.country_name || "",
      league_name: leagueName,
      teams
    };
    fs.writeFileSync(leagueTeamsFile, JSON.stringify(leagueTeamsData, null, 2), "utf8");
    console.log(`✓ Wrote ${path.relative(ROOT, leagueTeamsFile)}`);

    // 2) Global DB entry
    teamsGlobal.teams_by_league[leagueId] = teams;

    // 3) leagues_index entry (με path για app.js)
    const leaguePath = `/${continentFolder}/teams/${countryCode}/${leagueId}.json`;

    leaguesIndex.leagues[leagueId] = {
      league_id: leagueId,
      continent: meta.continent,
      continent_folder: continentFolder,
      country_code: countryCode,
      country_name: meta.country_name,
      display_name: leagueName,
      path: leaguePath
    };
  });

  // Γράφουμε global_teams_database.json
  ensureDir(INDEXES_DIR);
  fs.writeFileSync(GLOBAL_TEAMS_DB, JSON.stringify(teamsGlobal, null, 2), "utf8");
  console.log(`✓ Wrote ${path.relative(ROOT, GLOBAL_TEAMS_DB)}`);

  // Γράφουμε leagues_index.json
  fs.writeFileSync(LEAGUES_INDEX_FILE, JSON.stringify(leaguesIndex, null, 2), "utf8");
  console.log(`✓ Wrote ${path.relative(ROOT, LEAGUES_INDEX_FILE)}`);

  console.log("🎉 ΟΛΟΚΛΗΡΩΘΗΚΕ — όλα τα teams/indices χτίστηκαν από τον master.");
}

main();
