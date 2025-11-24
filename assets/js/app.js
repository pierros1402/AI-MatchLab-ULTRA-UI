// ================================================================
// AI MATCHLAB ULTRA – FRONTEND ENGINE (v2.0 AUTO-CLEAN BUILD)
// - Default continent: EUROPE (EU)
// - Auto-clean dropdowns
// - 5 panels: League / Country / Competition / Standings / Insights (standings/insights placeholder-ready)
// ================================================================

// Simple JSON loader with cache-bypass
async function loadJSON(path) {
    try {
        const res = await fetch(path + "?v=" + Date.now());
        if (!res.ok) throw new Error(`Failed to load ${path}`);
        return await res.json();
    } catch (err) {
        console.error("JSON Load Error:", path, err);
        return null;
    }
}

// Global cache
const continentsCache = {};

// Clear a <select> by id
function clearSelect(id) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
}

// Infer competition type from name
function inferCompetitionType(name) {
    if (!name) return "Competition";
    const n = name.toLowerCase();

    if (n.includes("super cup") || n.includes("supercup") || n.includes("supercopa")) return "Super Cup";
    if (n.includes("cup") || n.includes("trophy")) return "Cup";
    if (n.includes("league") || n.includes("liga") || n.includes("division") || n.includes("divisió") || n.includes("bundesliga")) return "League";
    if (n.includes("shield")) return "Trophy";

    return "Competition";
}

// ================================================================
// POPULATE CONTINENTS
// ================================================================
function populateContinents(list) {
    const sel = document.getElementById("continentSelect");
    if (!sel) return;

    sel.innerHTML = list
        .filter(c => c.continent_code && c.continent_name)
        .map(c => `<option value="${c.continent_code}">${c.continent_name}</option>`)
        .join("");

    sel.onchange = () => {
        const code = sel.value;
        loadCountries(code);
    };

    if (continentsCache["EU"]) {
        sel.value = "EU";
        loadCountries("EU");
    } else {
        const first = list.find(c => Array.isArray(c.countries));
        if (first) {
            sel.value = first.continent_code;
            loadCountries(first.continent_code);
        }
    }
}

// ================================================================
// LOAD COUNTRIES
// ================================================================
function loadCountries(continentCode) {
    const continentData = continentsCache[continentCode];
    const countrySel = document.getElementById("countrySelect");
    const leagueSel = document.getElementById("leagueSelect");
    const competitionInfo = document.getElementById("competitionInfoContainer");
    const countryInfo = document.getElementById("countryInfoContainer");

    if (!countrySel || !leagueSel) return;

    clearSelect("countrySelect");
    clearSelect("leagueSelect");

    if (!continentData || !Array.isArray(continentData.countries)) {
        countrySel.innerHTML = `<option value="ALL">All Countries</option>`;
        if (countryInfo) {
            countryInfo.innerHTML = `<p>Select a country to view info.</p>`;
        }
        if (competitionInfo && continentData) {
            competitionInfo.innerHTML = `
                <p><strong>Region:</strong> ${continentData.continent_name || continentCode}</p>
                <p><strong>Scope:</strong> ${continentCode === "INT" ? "International / Global" : "Continental"}</p>
                <p><strong>Countries:</strong> 0</p>
                <p><strong>Leagues:</strong> 0</p>
                <p><strong>Tier Range:</strong> N/A</p>
            `;
        }
        loadLeagues(continentCode, "ALL");
        return;
    }

    const countries = continentData.countries
        .filter(c => c.country_code && c.country_name)
        .sort((a, b) => a.country_name.localeCompare(b.country_name));

    countrySel.innerHTML =
        `<option value="ALL">All Countries</option>` +
        countries
            .map(c => `<option value="${c.country_code}">${c.country_name}</option>`)
            .join("");

    if (countryInfo) {
        countryInfo.innerHTML = `<p>Select a country to view info.</p>`;
    }

    if (competitionInfo) {
        let totalLeagues = 0;
        const leagueTiers = [];

        continentData.countries.forEach(c => {
            if (Array.isArray(c.leagues)) {
                totalLeagues += c.leagues.length;
                c.leagues.forEach(l => {
                    if (typeof l.tier === "number") leagueTiers.push(l.tier);
                });
            }
        });

        const minTier = leagueTiers.length ? Math.min(...leagueTiers) : null;
        const maxTier = leagueTiers.length ? Math.max(...leagueTiers) : null;
        const scope = (continentCode === "INT" ? "International / Global" : "Continental");

        competitionInfo.innerHTML = `
            <p><strong>Region:</strong> ${continentData.continent_name || continentCode}</p>
            <p><strong>Scope:</strong> ${scope}</p>
            <p><strong>Countries:</strong> ${Array.isArray(continentData.countries) ? continentData.countries.length : 0}</p>
            <p><strong>Leagues:</strong> ${totalLeagues}</p>
            <p><strong>Tier Range:</strong> ${minTier !== null ? `${minTier}–${maxTier}` : "N/A"}</p>
        `;
    }

    countrySel.onchange = () => {
        const code = countrySel.value;

        if (countryInfo) {
            if (code === "ALL") {
                countryInfo.innerHTML = `<p>Select a country to view info.</p>`;
            } else {
                const c = continentData.countries.find(x => x.country_code === code);
                if (c) {
                    const leagueCount = Array.isArray(c.leagues) ? c.leagues.length : 0;
                    countryInfo.innerHTML = `
                        <p><strong>Name:</strong> ${c.country_name}</p>
                        <p><strong>Code:</strong> ${c.country_code}</p>
                        <p><strong>Timezone:</strong> ${c.timezone || "N/A"}</p>
                        <p><strong>Leagues:</strong> ${leagueCount}</p>
                    `;
                } else {
                    countryInfo.innerHTML = `<p>Country not found.</p>`;
                }
            }
        }

        loadLeagues(continentCode, code);
    };

    loadLeagues(continentCode, "ALL");
}

// ================================================================
// LOAD LEAGUES
// ================================================================
function loadLeagues(continentCode, countryCode) {
    const continentData = continentsCache[continentCode];
    if (!continentData) return;

    let leagues = [];

    if (countryCode === "ALL") {
        if (Array.isArray(continentData.countries)) {
            continentData.countries.forEach(country => {
                if (Array.isArray(country.leagues)) leagues.push(...country.leagues);
            });
        }
    } else {
        const country = Array.isArray(continentData.countries)
            ? continentData.countries.find(c => c.country_code === countryCode)
            : null;
        if (country && Array.isArray(country.leagues)) {
            leagues = [...country.leagues];
        }
    }

    leagues = leagues
        .filter(l => l.league_id && l.display_name)
        .sort((a, b) => a.display_name.localeCompare(b.display_name));

    const sel = document.getElementById("leagueSelect");
    if (!sel) return;

    clearSelect("leagueSelect");

    sel.innerHTML =
        `<option value="ALL">All Leagues</option>` +
        leagues
            .map(l => `<option value="${l.league_id}">${l.display_name}</option>`)
            .join("");

    sel.onchange = () => {
        displayLeagueInfo(continentCode, countryCode, sel.value);
    };

    displayLeagueInfo(continentCode, countryCode, "ALL");
}

// ================================================================
// DISPLAY LEAGUE INFO + COMPETITION INFO
// ================================================================
function displayLeagueInfo(continentCode, countryCode, leagueId) {
    const continentData = continentsCache[continentCode];
    if (!continentData) return;

    let leagues = [];

    if (countryCode === "ALL") {
        if (Array.isArray(continentData.countries)) {
            continentData.countries.forEach(c => {
                if (Array.isArray(c.leagues)) leagues.push(...c.leagues);
            });
        }
    } else {
        const country = Array.isArray(continentData.countries)
            ? continentData.countries.find(c => c.country_code === countryCode)
            : null;
        if (country && Array.isArray(country.leagues)) {
            leagues = [...country.leagues];
        }
    }

    leagues = leagues.filter(l => l.league_id && l.display_name);

    const leagueInfoEl = document.getElementById("leagueInfoContainer");
    const competitionInfoEl = document.getElementById("competitionInfoContainer");

    if (!leagueInfoEl) return;

    if (leagueId === "ALL") {
        leagueInfoEl.innerHTML = `<p>Select a league to view info.</p>`;

        if (competitionInfoEl) {
            let totalLeagues = 0;
            const leagueTiers = [];

            if (Array.isArray(continentData.countries)) {
                continentData.countries.forEach(c => {
                    if (Array.isArray(c.leagues)) {
                        totalLeagues += c.leagues.length;
                        c.leagues.forEach(l => {
                            if (typeof l.tier === "number") leagueTiers.push(l.tier);
                        });
                    }
                });
            }

            const minTier = leagueTiers.length ? Math.min(...leagueTiers) : null;
            const maxTier = leagueTiers.length ? Math.max(...leagueTiers) : null;
            const scope = (continentCode === "INT" ? "International / Global" : "Continental");

            competitionInfoEl.innerHTML = `
                <p><strong>Region:</strong> ${continentData.continent_name || continentCode}</p>
                <p><strong>Scope:</strong> ${scope}</p>
                <p><strong>Countries:</strong> ${Array.isArray(continentData.countries) ? continentData.countries.length : 0}</p>
                <p><strong>Leagues:</strong> ${totalLeagues}</p>
                <p><strong>Tier Range:</strong> ${minTier !== null ? `${minTier}–${maxTier}` : "N/A"}</p>
            `;
        }

        return;
    }

    const league = leagues.find(l => l.league_id === leagueId);
    if (!league) {
        leagueInfoEl.innerHTML = `<p>League not found.</p>`;
        if (competitionInfoEl) {
            competitionInfoEl.innerHTML = `<p>Select a league or region to view competition details.</p>`;
        }
        return;
    }

    leagueInfoEl.innerHTML = `
        <p><strong>Name:</strong> ${league.display_name}</p>
        <p><strong>ID:</strong> ${league.league_id}</p>
        <p><strong>Tier:</strong> ${league.tier || "N/A"}</p>
        <p><strong>Betting:</strong> ${
            league.betting && league.betting.availability ? "Available" : "Unknown / No"
        }</p>
    `;

    if (competitionInfoEl) {
        const scope = (continentCode === "INT" ? "International / Global" : "Continental");
        const type = inferCompetitionType(league.display_name);
        const importance = typeof league.importance_score === "number"
            ? league.importance_score
            : null;
        const betting = league.betting && league.betting.availability ? "Available" : "Unknown / No";
        const regionName = continentData.continent_name || continentCode;

        competitionInfoEl.innerHTML = `
            <p><strong>Competition:</strong> ${league.display_name}</p>
            <p><strong>Type:</strong> ${type}</p>
            <p><strong>Region:</strong> ${regionName}</p>
            <p><strong>Scope:</strong> ${scope}</p>
            <p><strong>Tier:</strong> ${league.tier || "N/A"}</p>
            <p><strong>Importance:</strong> ${importance !== null ? importance : "N/A"}</p>
            <p><strong>Betting:</strong> ${betting}</p>
        `;
    }
}

// ================================================================
// INITIALIZATION
// ================================================================
async function initApp() {
    const data = await loadJSON("./data/continents.json");
    if (!data || !Array.isArray(data)) {
        console.error("Invalid continents.json");
        return;
    }

    data.forEach(cont => {
        if (cont.continent_code) {
            continentsCache[cont.continent_code] = cont;
        }
    });

    populateContinents(data);

    const footerYear = document.getElementById("footerYear");
    if (footerYear) {
        footerYear.textContent = new Date().getFullYear();
    }
}

// ================================================================
// BOOT
// ================================================================
document.addEventListener("DOMContentLoaded", initApp);
