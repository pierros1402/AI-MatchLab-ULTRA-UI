/* ============================================================
   AI MATCHLAB ULTRA — GLOBAL HISTORY ENGINE (v3.3 FINAL)
   - Uses Sofascore Proxy Worker
   - Unlimited leagues mapping
   - 10 seasons per league
   - Summary JSON + HTML
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

const HISTORY_ROOT = path.join(ROOT, "history");
const META_DIR = path.join(HISTORY_ROOT, "metadata");
const AUTO_MAP_FILE = path.join(META_DIR, "auto-leagues-map.json");
const SUMMARY_JSON = path.join(META_DIR, "history-summary.json");
const SUMMARY_HTML = path.join(META_DIR, "history-summary.html");

const MAX_SEASONS = 10;

/* ------------------- FS HELPERS ------------------- */

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
        "User-Agent": "AI-MatchLab-HistoryEngine/3.3"
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

function normalize(s) {
  if (!s) return "";
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/* ------------------- AUTO MAPPING ------------------- */

function loadAutoMap() {
  const data = readJSON(AUTO_MAP_FILE);
  if (data && data.map) return data;

  return {
    _meta: {
      created_at: new Date().toISOString(),
      description: "Auto Sofascore mapping (via proxy)"
    },
    map: {}
  };
}

function saveAutoMap(obj) {
  obj._meta.last_updated = new Date().toISOString();
  writeJSON(AUTO_MAP_FILE, obj);
}

function extractTournaments(node) {
  const res = [];
  function walk(n) {
    if (!n) return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (typeof n !== "object") return;
    if (Array.isArray(n.tournaments)) res.push(...n.tournaments);
    if (Array.isArray(n.uniqueTournaments)) res.push(...n.uniqueTournaments);
    for (const v of Object.values(n)) walk(v);
  }
  walk(node);
  return res;
}

function scoreMatch(league, country, t) {
  const l = normalize(league.display_name);
  const c = normalize(country.country_name);
  const reg = normalize(country.region_cluster || "");
  const tier = league.tier ?? null;

  const tn = normalize(t.name);
  const cn = normalize(t.category?.name || "");
  const cf = normalize(t.category?.flag || "");
  const slug = normalize(t.slug || "");
  const short = normalize(t.shortName || "");
  const lid = normalize(league.league_id);

  let s = 0;
  if (l && tn) {
    if (l === tn) s += 10;
    else if (tn.includes(l) || l.includes(tn)) s += 7;
  }
  if (c) {
    if (cn === c || cf === c) s += 6;
    else if (cn.includes(c) || c.includes(cn) || cf.includes(c)) s += 4;
  }
  if (reg) {
    if (cn.includes("europe") && reg.includes("europe")) s += 1;
    if (cn.includes("america") && reg.includes("america")) s += 1;
    if (cn.includes("asia") && reg.includes("asia")) s += 1;
    if (cn.includes("africa") && reg.includes("africa")) s += 1;
  }
  if (tier != null) {
    const tstr = String(tier);
    if (slug.includes(tstr) || short.includes(tstr)) s += 1;
  }
  if (lid && slug.includes(lid)) s += 1;
  return s;
}

async function autoMatchLeague(league, country) {
  const name = league.display_name;
  const countryName = country.country_name;

  const queries = [
    `${name} ${countryName}`,
    `${countryName} ${name}`,
    name
  ];

  let candidates = [];

  for (const q of queries) {
    const url = `${PROXY}/search/all?q=${encodeURIComponent(q)}`;
    const json = await fetchJSON(url);
    if (!json) continue;
    candidates = candidates.concat(extractTournaments(json));
    await sleep(120);
  }

  if (!candidates.length) {
    console.log(`   [MAP?] ${league.league_id} "${name}" → no results`);
    return null;
  }

  const uniq = [...new Map(candidates.map((t) => [t.id, t])).values()];

  let best = null;
  let bestScore = 0;

  for (const t of uniq) {
    const sc = scoreMatch(league, country, t);
    if (sc > bestScore) {
      best = t;
      bestScore = sc;
    }
  }

  if (!best || bestScore < 10) {
    console.log(`   [MAP?] ${league.league_id} weak score=${bestScore}`);
    return null;
  }

  console.log(
    `   [MAP] ${league.league_id} "${name}" → "${best.name}" (id=${best.id}, score=${bestScore})`
  );

  return {
    tournamentId: best.id,
    tournamentName: best.name
  };
}

async function ensureMapping(autoMap, league, country) {
  const id = league.league_id;
  if (!id) return null;

  if (autoMap.map[id] && autoMap.map[id].tournamentId) {
    return autoMap.map[id];
  }

  const m = await autoMatchLeague(league, country);
  if (!m) return null;

  autoMap.map[id] = m;
  saveAutoMap(autoMap);

  return m;
}

/* ------------------- SOFASCORE SEASONS ------------------- */

async function getSeasons(tid) {
  const json = await fetchJSON(`${PROXY}/unique-tournament/${tid}/seasons`);
  if (!json) return [];
  let arr = json.seasons || json.tournamentSeasons || [];
  if (!Array.isArray(arr)) arr = [];

  arr.sort((a, b) => {
    const ay = a.year || parseInt(String(a.name).match(/\d{4}/)?.[0] || "0");
    const by = b.year || parseInt(String(b.name).match(/\d{4}/)?.[0] || "0");
    return by - ay;
  });

  return arr.slice(0, MAX_SEASONS);
}

async function getEvents(tid, sid) {
  const json = await fetchJSON(
    `${PROXY}/unique-tournament/${tid}/season/${sid}/events`
  );
  if (!json || !Array.isArray(json.events)) return [];
  return json.events;
}

/* ------------------- MAP EVENT ------------------- */

function mapEvent(e, leagueId, seasonLabel, tid) {
  const h = e.homeTeam || {};
  const a = e.awayTeam || {};
  const s = e.status || {};
  const hs = e.homeScore || {};
  const as = e.awayScore || {};
  const ri = e.roundInfo || {};
  const t = e.tournament || {};

  return {
    provider: "sofascore",
    league_id: leagueId,
    season_key: seasonLabel,
    tournament_id: tid,
    match_id: e.id,
    start_timestamp: e.startTimestamp || null,
    status: s.type || null,
    round: ri.round || null,
    tournament_name: t.name || null,
    category: t.category?.name || null,
    home_team_id: h.id || null,
    home_team_name: h.name || null,
    away_team_id: a.id || null,
    away_team_name: a.name || null,
    score_ft_home: hs.current ?? null,
    score_ft_away: as.current ?? null,
    score_ht_home: hs.halftime ?? null,
    score_ht_away: as.halftime ?? null
  };
}

/* ------------------- SUMMARY ------------------- */

const SUMMARY = {
  engine_version: "3.3",
  run_at: "",
  leagues_processed: 0,
  leagues_mapped: 0,
  leagues_unmapped: 0,
  seasons_saved: 0,
  matches_saved: 0,
  updated: [],
  skipped: []
};

function saveSummary() {
  SUMMARY.run_at = new Date().toISOString();
  writeJSON(SUMMARY_JSON, SUMMARY);

  let upd = SUMMARY.updated
    .map(
      (x) =>
        `<tr><td>${x.league}</td><td>${x.season}</td><td>${x.matches}</td></tr>`
    )
    .join("");

  let skip = SUMMARY.skipped
    .map(
      (x) => `<tr><td>${x.league}</td><td>${x.reason}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:Arial;background:#111;color:#eee;padding:20px;}
table{border-collapse:collapse;width:100%;margin-top:15px;}
th,td{border:1px solid #555;padding:6px;}
th{background:#222;}
</style>
<title>History Summary</title></head>
<body>
<h2>AI MATCHLAB — History Summary</h2>
<p><b>Run at:</b> ${SUMMARY.run_at}</p>
<ul>
<li>Processed leagues: ${SUMMARY.leagues_processed}</li>
<li>Mapped: ${SUMMARY.leagues_mapped}</li>
<li>Unmapped: ${SUMMARY.leagues_unmapped}</li>
<li>Saved seasons: ${SUMMARY.seasons_saved}</li>
<li>Matches saved: ${SUMMARY.matches_saved}</li>
</ul>

<h3>Updated Leagues</h3>
<table><tr><th>League</th><th>Season</th><th>Matches</th></tr>
${upd}
</table>

<h3>Skipped Leagues</h3>
<table><tr><th>League</th><th>Reason</th></tr>
${skip}
</table>

</body></html>`;

  writeFile(SUMMARY_HTML, html);
  console.log("[SUMMARY] Written.");
}

/* ------------------- BUILD HISTORY ------------------- */

async function buildHistory(league, country, map) {
  SUMMARY.leagues_processed++;

  const leagueId = league.league_id;
  const tid = map.tournamentId;

  console.log(`\n[HISTORY] ${leagueId} → tid=${tid}`);

  const seasons = await getSeasons(tid);
  if (!seasons.length) {
    SUMMARY.skipped.push({ league: leagueId, reason: "no seasons" });
    SUMMARY.leagues_unmapped++;
    return;
  }

  const leagueDir = path.join(HISTORY_ROOT, leagueId);
  ensureDir(leagueDir);

  for (let i = 0; i < seasons.length; i++) {
    const s = seasons[i];
    const sid = s.id;
    const raw =
      s.year ||
      (s.name && String(s.name).match(/\d{4}/)?.[0]) ||
      s.name ||
      sid;
    const seasonKey = String(raw).replace(/[\/\\:*?"<>|]/g, "_");

    const isLatest = i === 0;
    const filePath = path.join(leagueDir, `${leagueId}_${seasonKey}.json`);

    if (fs.existsSync(filePath) && !isLatest) continue;

    console.log(`   [SEASON] ${seasonKey}`);

    const events = await getEvents(tid, sid);
    if (!events.length) continue;

    const matches = events.map((e) =>
      mapEvent(e, leagueId, seasonKey, tid)
    );

    writeJSON(filePath, {
      _meta: {
        league_id: leagueId,
        league_name: league.display_name,
        country: country.country_name,
        tournament_id: tid,
        season_id: sid,
        season_label: seasonKey,
        matches_count: matches.length,
        fetched_at: new Date().toISOString()
      },
      matches
    });

    SUMMARY.updated.push({
      league: leagueId,
      season: seasonKey,
      matches: matches.length
    });

    SUMMARY.seasons_saved++;
    SUMMARY.matches_saved += matches.length;

    await sleep(150);
  }

  SUMMARY.leagues_mapped++;
}

/* ------------------- MAIN ------------------- */

async function main() {
  console.log("=== AI MATCHLAB — GLOBAL HISTORY ENGINE v3.3 ===");

  ensureDir(HISTORY_ROOT);
  ensureDir(META_DIR);

  const global = readJSON(GLOBAL_PATH);
  if (!global) {
    console.log("ERROR: missing global dataset");
    return;
  }

  let autoMap = loadAutoMap();
  saveAutoMap(autoMap);

  for (const continent of Object.keys(global)) {
    if (continent === "International") continue;

    console.log(`\n=== CONTINENT ${continent} ===`);

    for (const country of global[continent]) {
      const leagues = country.leagues || [];

      console.log(
        `\n-- Country: ${country.country_name} (${country.country_code}), leagues=${leagues.length}`
      );

      for (const league of leagues) {
        const found = await ensureMapping(autoMap, league, country);
        if (!found) {
          SUMMARY.skipped.push({
            league: league.league_id,
            reason: "no mapping"
          });
          SUMMARY.leagues_unmapped++;
          continue;
        }

        await buildHistory(league, country, found);
        await sleep(200);
      }
    }
  }

  saveSummary();
  console.log("\n=== DONE ===");
}

main().catch((e) => {
  console.log("FATAL", e);
  try {
    saveSummary();
  } catch {}
});
