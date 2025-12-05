// ============================================================================
// AI MATCHLAB — WIKIPEDIA EUROPE LEAGUE SYSTEM SCRAPER
// v2.0 — Full per-country league extraction using validated URLs
// ============================================================================

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const cheerio = require("cheerio");

// Load the validated Wikipedia league system URL list
const URLS = require("./data/wiki_league_system_urls_FULL.json");

// Output folder
const OUTPUT_FOLDER = path.join(__dirname, "..", "wiki_output");
const OUTPUT_FILE = path.join(
  OUTPUT_FOLDER,
  "wiki_europe_competitions.json"
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
// Standard league_id generator
function createLeagueId(countryCode, text) {
  return (
    countryCode +
    "_" +
    text
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .toUpperCase()
  );
}

// Guess tier based on text
function detectTier(name) {
  const t = name.toLowerCase();
  if (t.includes("first") || t.includes("1st") || t.includes("super"))
    return 1;
  if (t.includes("second") || t.includes("2nd"))
    return 2;
  if (t.includes("third") || t.includes("3rd"))
    return 3;
  if (t.includes("fourth") || t.includes("4th"))
    return 4;
  if (t.includes("fifth") || t.includes("5th"))
    return 5;
  return null;
}

// Detect category
function detectCategory(name) {
  const t = name.toLowerCase();
  if (t.includes("cup")) return "cup";
  if (t.includes("league")) return "league";
  if (t.includes("women") || t.includes("female")) return "women";
  if (t.includes("youth") || t.includes("u19") || t.includes("u21"))
    return "youth";
  return "other";
}
// Extract leagues from a Wikipedia page using Cheerio
function extractLeagues($, countryCode) {
  const leagues = [];

  // Targets: lists, wikitables, bullets
  const areas = [
    "h2",
    "h3",
    "h4",
    "h5",
    "table",
    "ul"
  ];

  // Scan all lists and tables for league-like names
  $("ul li").each((_, li) => {
    const text = $(li).text().trim();
    if (!text) return;
    if (text.length < 3) return;

    if (
      text.toLowerCase().includes("league") ||
      text.toLowerCase().includes("cup") ||
      text.toLowerCase().includes("division") ||
      text.toLowerCase().includes("liga") ||
      text.toLowerCase().includes("premier") ||
      text.toLowerCase().includes("super")
    ) {
      leagues.push({
        league_id: createLeagueId(countryCode, text),
        display_name: text,
        tier: detectTier(text),
        category: detectCategory(text),
        source: "Wikipedia"
      });
    }
  });

  // Wikitable rows
  $("table tr").each((_, tr) => {
    const text = $(tr).text().trim();
    if (!text) return;

    if (
      text.toLowerCase().includes("league") ||
      text.toLowerCase().includes("cup") ||
      text.toLowerCase().includes("division") ||
      text.toLowerCase().includes("liga")
    ) {
      leagues.push({
        league_id: createLeagueId(countryCode, text),
        display_name: text.split("\n")[0].trim(),
        tier: detectTier(text),
        category: detectCategory(text),
        source: "Wikipedia"
      });
    }
  });

  return leagues;
}
(async () => {
  console.log("=====================================================");
  console.log("AI MATCHLAB — WIKIPEDIA EUROPE SCRAPER STARTING…");
  console.log("=====================================================");

  if (!fs.existsSync(OUTPUT_FOLDER)) {
    fs.mkdirSync(OUTPUT_FOLDER, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const final = {};

  for (const [code, url] of Object.entries(URLS)) {
    console.log(`\n${code} → ${url}`);

    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000
      });

      await sleep(1500); // allow lazy loading

      const html = await page.content();
      const $ = cheerio.load(html);

      const leagues = extractLeagues($, code);

      console.log(`Extracted: ${leagues.length} competitions`);

      final[code] = {
        country_code: code,
        country_name: url.split("_in_").pop().replace(/_/g, " "),
        leagues
      };
    } catch (err) {
      console.log(`❌ ERROR for ${code}:`, err.message);
      final[code] = {
        country_code: code,
        country_name: "",
        leagues: [],
        error: true
      };
    }

    await sleep(800);
  }

  await browser.close();

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(final, null, 2), "utf8");

  console.log("\n=======================================");
  console.log("DONE → Saved Europe league system:");
  console.log(OUTPUT_FILE);
  console.log("=======================================");
})();
