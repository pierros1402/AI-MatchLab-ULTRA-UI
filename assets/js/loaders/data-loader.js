/* ============================================================================
   AI MATCHLAB ULTRA — DATA LOADER (CONTINENT-BASED)
   Loads all navigation data directly from betting_ready_FINAL.json per continent
============================================================================ */

const BASE = "/AI-MATCHLAB-DATA";

/* --------------------------------------
   Fetch helper
--------------------------------------- */
async function loadJSON(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed: ${path}`);
    return await res.json();
  } catch (err) {
    console.error("loadJSON error:", path, err);
    return null;
  }
}

/* --------------------------------------
   CONVERT CONTINENT ID → FILE
--------------------------------------- */
const CONTINENT_PATHS = {
  AFRICA: "africa/africa_betting_ready_FINAL.json",
  ASIA: "asia/asia_betting_ready_FINAL.json",
  EUROPE: "europe/europe_betting_ready_FINAL.json",
  NORTH_AMERICA: "north_america/north_america_betting_ready_FINAL.json",
  SOUTH_AMERICA: "south_america/south_america_betting_ready_FINAL.json",
  OCEANIA: "oceania/oceania_betting_ready_FINAL.json",
  INTERNATIONAL: "international/international_betting_ready_FINAL.json"
};

/* ============================================================================
   1) LOAD CONTINENT
      Returns full structure: countries[], leagues[], teams[]
============================================================================ */
export async function loadContinent(continentId) {
  const file = CONTINENT_PATHS[continentId];
  if (!file) return null;

  return await loadJSON(`${BASE}/${file}`);
}

/* ============================================================================
   2) LOAD COUNTRIES from continent dataset
============================================================================ */
export async function loadCountries(continentId) {
  const data = await loadContinent(continentId);
  if (!data || !data.countries) return [];
  return data.countries;
}

/* ============================================================================
   3) LOAD LEAGUES of a specific country
============================================================================ */
export async function loadLeagues(continentId, countryCode) {
  const data = await loadContinent(continentId);
  if (!data || !data.leagues) return [];

  return data.leagues.filter(l => l.country_code === countryCode);
}

/* ============================================================================
   4) LOAD TEAMS of a specific league
============================================================================ */
export async function loadTeams(continentId, leagueId) {
  const data = await loadContinent(continentId);
  if (!data || !data.teams) return [];

  return data.teams.filter(t => t.league_id === leagueId);
}
