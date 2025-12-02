/* ============================================================
   AI MATCHLAB ULTRA — GLOBAL TEAMS ENGINE v1.2 (FINAL)
   Uses Sofascore Proxy Worker
   Fetches CURRENT SEASON teams only
   Writes:
     teams/{LEAGUE}/{LEAGUE}_{SEASON}.json
     teams/metadata/teams-summary.json
============================================================ */

const fs = require("fs");
const path = require("path");

const PROXY = "https://sofascore-proxy.pierros1402.workers.dev";

const ROOT = __dirname.replace(/[/\\]tools$/, "");

const GLOBAL_PATH = path.join(
  ROOT,
  "indexes",
  "global_leagues_master_GLOBAL.json"
);

// Use the mapping created by history engine
const MAP_PATH = path.join(
  ROOT,
  "history",
  "metadata",
  "auto-leagues-map.json"
);

const TEAMS_ROOT = path.join(ROOT, "teams");
const META_DIR = path.join(TEAMS_ROOT, "metadata");

const SUMMARY_JSON = path.join(META_DIR, "teams-summary.json");
const SUMMARY_HTML = path.join(META_DIR, "teams-summary.html");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readJSON(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function writeJSON(p, obj) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}

function writeFile(p, txt) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, txt, "utf8");
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJSON(url) {
  console.log("   [HTTP]", url);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "AI-MatchLab-TeamsEngine/1.2"
      }
    });
    if (!res.ok) {
      console.log("   [HTTP ERROR]", res.status);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.log("   [HTTP FAIL]", e.message);
    return null;
  }
}

/* ---------------------- SUMMARY ---------------------- */

const SUMMARY = {
  run_at: "",
  processed: 0,
  ok: 0,
  fail: 0,
  updates: []
};

function saveSummary() {
  SUMMARY.run_at = new Date().toISOString();
  writeJSON(SUMMARY_JSON, SUMMARY);

  let rows = SUMMARY.updates
    .map(
      (x) =>
        `<tr><td>${x.league}</td><td>${x.season}</td><td>${x.teams}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{background:#111;color:#eee;font-family:Arial;padding:18px;}
table{border-collapse:collapse;width:100%;margin-top:15px;}
td,th{border:1px solid #444;padding:6px;font-size:13px;}
th{background:#222;}
</style><title>Teams Summary</title></head>
<body>
<h2>AI MATCHLAB — Teams Summary</h2>
<p><b>Run at:</b> ${SUMMARY.run_at}</p>
<ul>
<li>Processed leagues: ${SUMMARY.processed}</li>
<li>Successful: ${SUMMARY.ok}</li>
<li>Failed: ${SUMMARY.fail}</li>
</ul>

<table>
<tr><th>League</th><th>Season</th><th>Teams</th></tr>
${rows}
</table>
</body></html>`;

  writeFile(SUMMARY_HTML, html);
}

/* ---------------------- TEAMS FETCH ---------------------- */

async function getCurrentSeasonId(tid) {
  const json = await fetchJSON(`${PROXY}/unique-tournament/${tid}/seasons`);
  if (!json || !json.seasons?.length) return null;
  return json.seasons[0].id; // latest
}

async function getTeams(tid, sid) {
  const json = await fetchJSON(
    `${PROXY}/unique-tournament/${tid}/season/${sid}/standings`
  );
  if (!json || !json.standings?.length) return [];

  const rows = json.standings[0].rows || [];
  return rows.map((row) => ({
    id: row.team?.id || null,
    name: row.team?.name || null,
    shortName: row.team?.shortName || null,
    slug: row.team?.slug || null,
    country: row.team?.country || null,
    crest: row.team?.crest || null,
    played: row.matches || 0,
    wins: row.wins || 0,
    draws: row.draws || 0,
    losses: row.losses || 0,
    goalsFor: row.scoresFor || 0,
    goalsAgainst: row.scoresAgainst || 0,
    points: row.points || 0,
    position: row.position || null
  }));
}

/* ---------------------- MAIN ---------------------- */

async function main() {
  console.log("=== AI MATCHLAB — GLOBAL TEAMS ENGINE v1.2 ===");

  ensureDir(TEAMS_ROOT);
  ensureDir(META_DIR);

  const global = readJSON(GLOBAL_PATH);
  const map = readJSON(MAP_PATH);

  if (!map) {
    console.log("ERROR: mapping missing. Run history engine first.");
    return;
  }

  for (const continent of Object.keys(global)) {
    if (continent === "International") continue;

    console.log(`\n=== CONTINENT ${continent} ===`);

    for (const country of global[continent]) {
      const leagues = country.leagues || [];

      console.log(
        `\n-- Country: ${country.country_name} (${country.country_code}), leagues=${leagues.length}`
      );

      for (const league of leagues) {
        SUMMARY.processed++;
        const id = league.league_id;

        if (!map.map[id]) {
          console.log(`   [SKIP] ${id} (no mapping)`);
          SUMMARY.fail++;
          continue;
        }

        const tid = map.map[id].tournamentId;

        console.log(`\n[TEAMS] ${id} → tid=${tid}`);

        const sid = await getCurrentSeasonId(tid);
        if (!sid) {
          console.log("   [FAIL] No season");
          SUMMARY.fail++;
          continue;
        }

        const teams = await getTeams(tid, sid);
        if (!teams.length) {
          console.log("   [FAIL] No teams");
          SUMMARY.fail++;
          continue;
        }

        const year = new Date().getFullYear();
        const seasonKey = `${year}_${year + 1}`;

        const dir = path.join(TEAMS_ROOT, id);
        ensureDir(dir);

        writeJSON(path.join(dir, `${id}_${seasonKey}.json`), {
          _meta: {
            league_id: id,
            season_id: sid,
            season_label: seasonKey,
            teams_count: teams.length,
            fetched_at: new Date().toISOString()
          },
          teams
        });

        SUMMARY.ok++;
        SUMMARY.updates.push({
          league: id,
          season: seasonKey,
          teams: teams.length
        });

        await sleep(120);
      }
    }
  }

  saveSummary();
  console.log("\n=== TEAMS DONE ===");
}

main();
