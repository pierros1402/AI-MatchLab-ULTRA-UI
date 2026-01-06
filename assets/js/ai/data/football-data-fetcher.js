// =====================================================
// Football-Data Auto Fetcher (Local)
// File: assets/js/ai/data/football-data-fetcher.js
// =====================================================

import fs from "fs";
import path from "path";
import https from "https";

// -----------------------------
// CONFIG
// -----------------------------
const BASE_URL = "https://www.football-data.co.uk/mmz4281";
const TARGET_ROOT = "./data/football-data";

const LEAGUES = {
  ENG1: "E0",
  ENG2: "E1",
  ENG3: "E2",
  ENG4: "E3",
  SPA1: "SP1",
  GER1: "D1",
  ITA1: "I1",
  FRA1: "F1",
  NED1: "N1",
  BEL1: "B1",
  POR1: "P1",
  GRE1: "G1",
  TUR1: "T1"
};

// seasons like 1415, 1516, ..., 2425
const SEASONS = [];
for (let y = 14; y <= 25; y++) {
  SEASONS.push(`${y}${y + 1}`);
}

// -----------------------------
// HELPERS
// -----------------------------
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    https.get(url, res => {
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return resolve(false);
      }
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve(true);
      });
    }).on("error", err => {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

// -----------------------------
// MAIN
// -----------------------------
async function run() {
  ensureDir(TARGET_ROOT);

  for (const [leagueId, code] of Object.entries(LEAGUES)) {
    const leagueDir = path.join(TARGET_ROOT, leagueId);
    ensureDir(leagueDir);

    for (const season of SEASONS) {
      const fileName = `${code}_${season}.csv`;
      const dest = path.join(leagueDir, fileName);

      if (fs.existsSync(dest)) {
        continue; // already have it
      }

      const url = `${BASE_URL}/${season}/${code}.csv`;
      console.log(`Fetching ${leagueId} ${season}...`);

      try {
        const ok = await download(url, dest);
        if (!ok) {
          console.log(`  ✗ not available`);
        } else {
          console.log(`  ✓ saved`);
        }
      } catch (e) {
        console.log(`  ✗ error`);
      }
    }
  }

  console.log("Done.");
}

// -----------------------------
run();
