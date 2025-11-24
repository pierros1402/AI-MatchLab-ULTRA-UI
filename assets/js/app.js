// ================================================================
// AI MATCHLAB ULTRA – FRONTEND ENGINE (v1.0 CLEAN BUILD)
// Dynamic continent → country → league loader
// Clean dropdowns, no undefined, no INT/FIFA mixing
// ================================================================

// Global cache for loaded JSON files
const continentsCache = {};
const countriesCache = {};
const leaguesCache = {};

async function loadJSON(path) {
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Failed to load ${path}`);
        return await res.json();
    } catch (err) {
        console.error("JSON Load Error:", path, err);
        return null;
    }
}

// ================================================================
// POPULATE CONTINENTS  (FIXED)
// - Loads only real continents (those that have countries)
// - Excludes INT, FIFA, AFC, CAF, CONCACAF, OFC
// - Ensures dropdown clean + working
// ================================================================
function populateContinents(list) {
    const sel = document.getElementById("continentSelect");

    sel.innerHTML = list
        .filter(c =>
            c.continent_code &&
            c.continent_name &&
            Array.isArray(c.countries)
        )
        .map(c =>
            `<option value="${c.continent_code}">${c.continent_name}</option>`
        )
        .join("");

    sel.addEventListener("change", () => {
        loadCountries(sel.value);
    });

    const first = list.find(c => Array.isArray(c.countries));
    if (first) loadCountries(first.continent_code);
}

// ================================================================
// LOAD COUNTRIES (FIXED)
// - Handles “no countries” case (INT, FIFA etc)
// - Removes undefined entries completely
// ================================================================
async function loadCountries(continentCode) {

    const continentData = continentsCache[continentCode];
    if (!continentData) {
        console.error("No continent data for", continentCode);
        return;
    }

    // FIX → Ignore INT / FIFA / AFC / CAF / etc
    if (!Array.isArray(continentData.countries)) {
        document.getElementById("countrySelect").innerHTML =
            `<option value="ALL">All Countries</option>`;
        return;
    }

    const countries = continentData.countries;

    const sel = document.getElementById("countrySelect");
    sel.innerHTML =
        `<option value="ALL">All Countries</option>` +
        countries
            .filter(c => c.country_code && c.country_name) // remove undefined
            .map(c =>
                `<option value="${c.country_code}">${c.country_name}</option>`
            )
            .join("");

    sel.addEventListener("change", () => {
        loadLeagues(continentCode, sel.value);
    });

    loadLeagues(continentCode, "ALL");
}
// ================================================================
// LOAD LEAGUES (FIXED)
// - Loads all leagues for selected country
// - If "ALL", merges all leagues from all countries
// - Always filters undefined entries
// ================================================================
async function loadLeagues(continentCode, countryCode) {

    const continentData = continentsCache[continentCode];
    if (!continentData || !Array.isArray(continentData.countries)) {
        console.warn("No valid continent data for leagues:", continentCode);
        return;
    }

    let leagues = [];

    if (countryCode === "ALL") {
        // Merge all leagues from every country
        continentData.countries.forEach(country => {
            if (Array.isArray(country.leagues)) {
                leagues.push(...country.leagues);
            }
        });
    } else {
        const country = continentData.countries.find(c => c.country_code === countryCode);
        if (country && Array.isArray(country.leagues)) {
            leagues = [...country.leagues];
        }
    }

    // Clean undefined or invalid entries
    leagues = leagues.filter(l => l.league_id && l.display_name);

    const sel = document.getElementById("leagueSelect");
    sel.innerHTML =
        `<option value="ALL">All Leagues</option>` +
        leagues
            .map(l =>
                `<option value="${l.league_id}">${l.display_name}</option>`
            )
            .join("");

    sel.addEventListener("change", () => {
        displayLeagueInfo(continentCode, countryCode, sel.value);
    });

    displayLeagueInfo(continentCode, countryCode, "ALL");
}

// ================================================================
// DISPLAY LEAGUE INFORMATION
// ================================================================
function displayLeagueInfo(continentCode, countryCode, leagueId) {

    const continentData = continentsCache[continentCode];
    if (!continentData || !Array.isArray(continentData.countries)) return;

    let leagues = [];

    if (countryCode === "ALL") {
        continentData.countries.forEach(country => {
            if (Array.isArray(country.leagues)) leagues.push(...country.leagues);
        });
    } else {
        const country = continentData.countries.find(c => c.country_code === countryCode);
        if (country && Array.isArray(country.leagues)) leagues = [...country.leagues];
    }

    leagues = leagues.filter(l => l.league_id && l.display_name);

    const out = document.getElementById("leagueOutput");
    if (!out) return;

    if (leagueId === "ALL") {
        out.innerHTML = "<p>Select a league to view info.</p>";
    } else {
        const league = leagues.find(l => l.league_id === leagueId);
        if (league) {
            out.innerHTML = `
                <h3>${league.display_name}</h3>
                <p><strong>League ID:</strong> ${league.league_id}</p>
                <p><strong>Tier:</strong> ${league.tier || "N/A"}</p>
            `;
        }
    }
}
// ================================================================
// INITIALIZATION
// - Loads continents.json
// - Caches all data
// - Starts UI chain
// ================================================================
async function initApp() {
    try {
        const data = await loadJSON("./data/continents.json");
        if (!Array.isArray(data)) {
            console.error("Invalid continents.json format");
            return;
        }

        // Cache continents (EU, ASIA, AFRICA, etc.)
        data.forEach(cont => {
            continentsCache[cont.continent_code] = cont;
        });

        // Populate dropdowns with clean data
        populateContinents(data);

    } catch (err) {
        console.error("Init error:", err);
    }
}

// ================================================================
// ON PAGE LOAD
// ================================================================
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});
