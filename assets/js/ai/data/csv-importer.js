// =====================================================
// Football-Data CSV Importer
// File: assets/js/ai/data/csv-importer.js
// =====================================================

import fs from "fs";
import path from "path";

// -----------------------------
// CONFIG
// -----------------------------
const CONFIG = {
  dateFormat: "DD/MM/YYYY",
  leagues: {
    ENG1: "E0",
    ENG2: "E1",
    ENG3: "E2",
    ENG4: "E3",
    ENG5: "EC"
  }
};

// -----------------------------
// CSV PARSER (simple & safe)
// -----------------------------
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");

  return lines.map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = values[i]?.trim();
    });
    return obj;
  });
}

// -----------------------------
// DATE NORMALIZER
// -----------------------------
function normalizeDate(d) {
  if (!d) return null;
  const [day, month, year] = d.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// -----------------------------
// MAIN IMPORTER
// -----------------------------
/**
 * importFootballDataCSV
 *
 * @param {string} filePath
 * @param {string} leagueId (e.g. ENG1)
 * @param {string} season (e.g. 1415)
 */
export function importFootballDataCSV(filePath, leagueId, season) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const rows = parseCSV(raw);

  const matches = [];

  for (const r of rows) {
    if (!r.HomeTeam || !r.AwayTeam) continue;
    if (!r.FTHG || !r.FTAG) continue;

    matches.push({
      league: leagueId,
      season,
      date: normalizeDate(r.Date),
      home: r.HomeTeam,
      away: r.AwayTeam,
      goalsHome: Number(r.FTHG),
      goalsAway: Number(r.FTAG),
      odds: {
        home: Number(r.B365H || r.AvgH || null),
        draw: Number(r.B365D || r.AvgD || null),
        away: Number(r.B365A || r.AvgA || null)
      }
    });
  }

  return matches;
}

// -----------------------------
// BULK IMPORT HELPER
// -----------------------------
export function importLeagueSeasonFolder(folderPath, leagueId) {
  const files = fs.readdirSync(folderPath);
  const all = [];

  for (const file of files) {
    if (!file.endsWith(".csv")) continue;

    const season = file.match(/\d{2}\d{2}/)?.[0] || "unknown";
    const fullPath = path.join(folderPath, file);

    const seasonMatches = importFootballDataCSV(
      fullPath,
      leagueId,
      season
    );

    all.push(...seasonMatches);
  }

  return all;
}
