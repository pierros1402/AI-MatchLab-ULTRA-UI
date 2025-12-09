/* ============================================================
   AI MATCHLAB ULTRA — APP.JS
   Continents → Countries → Leagues → Basic Details
   Uses *_betting_ready_FINAL.json per continent
============================================================ */

import { openAccordion } from "./accordion.js";

const DATA_BASE = "/AI-MATCHLAB-DATA";

const CONTINENT_FILES = {
  africa:        `${DATA_BASE}/africa/africa_betting_ready_FINAL.json`,
  asia:          `${DATA_BASE}/asia/asia_betting_ready_FINAL.json`,
  europe:        `${DATA_BASE}/europe/europe_betting_ready_FINAL.json`,
  north_america: `${DATA_BASE}/north_america/north_america_betting_ready_FINAL.json`,
  south_america: `${DATA_BASE}/south_america/south_america_betting_ready_FINAL.json`,
  oceania:       `${DATA_BASE}/oceania/oceania_betting_ready_FINAL.json`,
  international: `${DATA_BASE}/international/international_betting_ready_FINAL.json`
};

const CONTINENT_LABELS = {
  africa: "Africa",
  asia: "Asia",
  europe: "Europe",
  north_america: "North America",
  south_america: "South America",
  oceania: "Oceania",
  international: "International"
};

let CURRENT_CONTINENT_DATA = [];
let CURRENT_COUNTRY = null;

/* ----------------------------------------------
   BUILD CONTINENT LIST
---------------------------------------------- */
function buildContinents() {
  const panel = document.getElementById("panel-continents");
  if (!panel) return;
  panel.innerHTML = "";

  Object.keys(CONTINENT_FILES).forEach((key) => {
    const div = document.createElement("div");
    div.className = "nav-item";
    div.textContent = CONTINENT_LABELS[key] || key;
    div.onclick = () => loadContinent(key);
    panel.appendChild(div);
  });
}

/* ----------------------------------------------
   LOAD CONTINENT JSON
---------------------------------------------- */
async function loadContinent(key) {
  const file = CONTINENT_FILES[key];
  if (!file) return;

  try {
    const res = await fetch(file, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // data = array of countries
    CURRENT_CONTINENT_DATA = Array.isArray(data) ? data : [];
    buildCountries();
    openAccordion("panel-countries");
  } catch (err) {
    console.error("Failed to load continent", key, err);
  }
}

/* ----------------------------------------------
   BUILD COUNTRIES
---------------------------------------------- */
function buildCountries() {
  const panel = document.getElementById("panel-countries");
  const leaguesPanel = document.getElementById("panel-leagues");
  const teamsPanel = document.getElementById("panel-teams");
  const matchesPanel = document.getElementById("panel-matches");
  const detailsPanel = document.getElementById("panel-details");

  if (!panel) return;
  panel.innerHTML = "";
  leaguesPanel && (leaguesPanel.innerHTML = "");
  teamsPanel && (teamsPanel.innerHTML = "");
  matchesPanel && (matchesPanel.innerHTML = "");
  detailsPanel && (detailsPanel.innerHTML = "");

  const sorted = [...CURRENT_CONTINENT_DATA].sort((a, b) =>
    a.country_name.localeCompare(b.country_name)
  );

  sorted.forEach((country) => {
    const div = document.createElement("div");
    div.className = "nav-item";
    div.textContent = country.country_name;
    div.onclick = () => buildLeagues(country);
    panel.appendChild(div);
  });
}

/* ----------------------------------------------
   BUILD LEAGUES FOR COUNTRY
---------------------------------------------- */
function buildLeagues(country) {
  CURRENT_COUNTRY = country;
  const panel = document.getElementById("panel-leagues");
  const teamsPanel = document.getElementById("panel-teams");
  const matchesPanel = document.getElementById("panel-matches");
  const detailsPanel = document.getElementById("panel-details");

  if (!panel) return;
  panel.innerHTML = "";
  teamsPanel && (teamsPanel.innerHTML = "");
  matchesPanel && (matchesPanel.innerHTML = "");
  detailsPanel && (detailsPanel.innerHTML = "");

  const leagues = Array.isArray(country.leagues) ? country.leagues : [];
  const sorted = [...leagues].sort((a, b) =>
    (a.tier || 99) - (b.tier || 99) || a.display_name.localeCompare(b.display_name)
  );

  sorted.forEach((league) => {
    const div = document.createElement("div");
    div.className = "nav-item";
    div.textContent = league.display_name;
    div.onclick = () => showLeagueDetails(country, league);
    panel.appendChild(div);
  });

  openAccordion("panel-leagues");
}

/* ----------------------------------------------
   SHOW LEAGUE DETAILS (BASIC)
---------------------------------------------- */
function showLeagueDetails(country, league) {
  const teamsPanel = document.getElementById("panel-teams");
  const matchesPanel = document.getElementById("panel-matches");
  const detailsPanel = document.getElementById("panel-details");

  teamsPanel && (teamsPanel.innerHTML = `<div class="muted">Teams data not loaded yet.</div>`);
  matchesPanel && (matchesPanel.innerHTML = `<div class="muted">Matches will be wired to history/live later.</div>`);

  if (!detailsPanel) return;

  detailsPanel.innerHTML = `
    <div class="card">
      <h3>${league.display_name}</h3>
      <div class="muted" style="margin-top:4px;">${country.country_name} · ${country.country_code}</div>
      <div style="margin-top:6px;font-size:12px;">
        <div><strong>League ID:</strong> ${league.league_id || "-"}</div>
        <div><strong>Tier:</strong> ${league.tier != null ? league.tier : "-"}</div>
        <div><strong>Type:</strong> ${league.type || "league"}</div>
      </div>
    </div>
  `;

  openAccordion("panel-details");
}

/* ----------------------------------------------
   INIT
---------------------------------------------- */
function initApp() {
  buildContinents();
  openAccordion("panel-continents");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
