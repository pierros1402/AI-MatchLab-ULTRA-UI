/**
 * build_espn_league_map_FROM_SCRATCH.mjs
 *
 * Builds a NEW ESPN league map from scratch
 * using ONLY publicly available ESPN data.
 *
 * Node 18+ (native fetch)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* paths */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const OUT_PATH = path.join(
  ROOT,
  "AI-MATCHLAB-DATA",
  "mappings",
  "espn_league_kv_map_FULL_FINAL.json"
);

/* helpers */
function ymd(d) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function normName(name, slug) {
  if (name) return name;
  return slug
    .replace(/\./g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

/* main */
(async function run() {
  const leagues = Object.create(null);
  const today = new Date();
  const RANGE = 120; // ±120 days

  console.log("⏳ Building ESPN league map FROM SCRATCH");
  console.log(`⏳ Scanning ESPN scoreboards (±${RANGE} days)`);

  for (let d = -RANGE; d <= RANGE; d++) {
    const dt = new Date(today);
    dt.setDate(today.getDate() + d);
    const dateStr = ymd(dt);

    const url =
      `https://site.api.espn.com/apis/site/v2/sports/soccer/scoreboard?dates=${dateStr}`;

    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const json = await res.json();
      const events = Array.isArray(json?.events) ? json.events : [];

      for (const ev of events) {
        const comp = ev?.competitions?.[0];
        const lg = comp?.league;

        if (!lg || !lg.slug) continue;

        if (!leagues[lg.slug]) {
          leagues[lg.slug] = {
            slug: lg.slug,
            leagueName: normName(lg.name, lg.slug),
            id: lg.id || null
          };
        }
      }
    } catch {
      // ignore single-day failures
    }
  }

  const count = Object.keys(leagues).length;

  fs.writeFileSync(
    OUT_PATH,
    JSON.stringify(leagues, null, 2),
    "utf8"
  );

  console.log("====================================");
  console.log(`✔ FINAL leagues discovered: ${count}`);
  console.log("✔ Written:", OUT_PATH);
  console.log("➡ Upload this file to KV as ESPN:LEAGUE_MAP:v1");
})();
