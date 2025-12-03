/* ======================================================================
   AI-MATCHLAB — GLOBAL DATA VALIDATION ENGINE
   Checks the integrity of: global_leagues_master_FINAL.json
   Safe: READ-ONLY (no file modifications)
   ====================================================================== */

import fs from "fs";

// ------------------------------------------------------------
// 1) Load global file
// ------------------------------------------------------------
const GLOBAL_PATH = "./global_leagues_master_FINAL.json";

let raw = "";
try {
    raw = fs.readFileSync(GLOBAL_PATH, "utf8");
} catch (err) {
    console.error("❌ ERROR: Cannot read global file:", GLOBAL_PATH);
    process.exit(1);
}

let data;
try {
    data = JSON.parse(raw);
} catch (err) {
    console.error("❌ JSON PARSE ERROR:", err.message);
    process.exit(1);
}

// ------------------------------------------------------------
// 2) Prepare error collection
// ------------------------------------------------------------
let errors = [];
let leagueIds = new Set();
let lastCountry = null;

// ------------------------------------------------------------
// 3) Validation Rules
// ------------------------------------------------------------
data.forEach((country, index) => {
    const { country_code, country_name, region_cluster, leagues } = country;

    // A) Validate required fields
    if (!country_code) errors.push(`Country #${index} missing country_code`);
    if (!country_name) errors.push(`Country #${index} missing country_name`);
    if (!region_cluster) errors.push(`Country ${country_name} missing region_cluster`);

    // B) Check alphabetical order based on country_name
    if (lastCountry && country_name.localeCompare(lastCountry) < 0) {
        errors.push(
            `Alphabetical order error: "${country_name}" should come BEFORE "${lastCountry}"`
        );
    }
    lastCountry = country_name;

    // C) Leagues array must exist
    if (!Array.isArray(leagues)) {
        errors.push(`Country ${country_name} has INVALID leagues array`);
        return;
    }

    // D) Validate each league
    leagues.forEach((league) => {
        const { league_id, display_name, tier } = league;

        if (!league_id) errors.push(`Country ${country_name} has league with MISSING league_id`);
        if (!display_name) errors.push(`League ${league_id} missing display_name`);
        if (tier === undefined || tier === null) {
            errors.push(`League ${league_id} missing tier`);
        } else if (typeof tier !== "number") {
            errors.push(`League ${league_id} has invalid tier (not number)`);
        }

        // Duplicate league_id check
        if (leagueIds.has(league_id)) {
            errors.push(`Duplicate league_id detected: ${league_id}`);
        } else {
            leagueIds.add(league_id);
        }
    });
});

// ------------------------------------------------------------
// 4) Print summary
// ------------------------------------------------------------
console.log("========================================================");
console.log(" AI-MATCHLAB — GLOBAL DATA VALIDATION REPORT");
console.log("========================================================\n");

if (errors.length === 0) {
    console.log("✅ VALIDATION PASSED — No errors found.\n");
} else {
    console.log(`❌ VALIDATION FAILED — ${errors.length} issues found:\n`);
    errors.forEach((e) => console.log(" - " + e));
    console.log("\n========================================================");
    console.log("Please fix the above errors in global_leagues_master_FINAL.json");
}

console.log("\nDone.");
