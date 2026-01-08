// assets/js/ai/eval/results-map.js
import fs from "fs";
import path from "path";

const FIXTURES_ROOT = path.resolve(
  "odds-history-collector/fixtures/v1"
);

export function buildResultsMap() {
  const results = {};

  if (!fs.existsSync(FIXTURES_ROOT)) {
    throw new Error("Fixtures folder not found: " + FIXTURES_ROOT);
  }

  const leagues = fs.readdirSync(FIXTURES_ROOT);

  leagues.forEach(leagueDir => {
    const leaguePath = path.join(FIXTURES_ROOT, leagueDir);
    if (!fs.statSync(leaguePath).isDirectory()) return;

    const files = fs.readdirSync(leaguePath)
      .filter(f => f.endsWith(".json"));

    files.forEach(file => {
      const fullPath = path.join(leaguePath, file);
      const data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));

      (data.matches || []).forEach(m => {
        const status = String(m.status || "").toUpperCase();

        // Κρατάμε ΜΟΝΟ τελειωμένους αγώνες
        if (status !== "FT" && status !== "FINISHED") return;

        if (!m.id || m.scoreHome == null || m.scoreAway == null) return;

        results[m.id] = {
          home: Number(m.scoreHome),
          away: Number(m.scoreAway)
        };
      });
    });
  });

  return results;
}
