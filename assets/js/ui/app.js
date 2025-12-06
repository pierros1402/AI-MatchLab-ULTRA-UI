/* ============================================================
   AI MATCHLAB ULTRA — APP.JS (FINAL – LOAD CONTINENTS → COUNTRIES → LEAGUES)
   Using ONLY betting_ready_FINAL.json per continent folder
============================================================ */

const DATA_BASE = "/AI-MATCHLAB-DATA";

/* ----------------------------------------------
   CONTINENT → JSON PATHS
---------------------------------------------- */
const CONTINENT_FILES = {
  africa:        `${DATA_BASE}/africa/africa_betting_ready_FINAL.json`,
  asia:          `${DATA_BASE}/asia/asia_betting_ready_FINAL.json`,
  europe:        `${DATA_BASE}/europe/europe_betting_ready_FINAL.json`,
  north_america: `${DATA_BASE}/north_america/north_america_betting_ready_FINAL.json`,
  south_america: `${DATA_BASE}/south_america/south_america_betting_ready_FINAL.json`,
  oceania:       `${DATA_BASE}/oceania/oceania_betting_ready_FINAL.json`,
  international: `${DATA_BASE}/international/international_betting_ready_FINAL.json`
};

let CURRENT_CONTINENT_DATA = null;

/* ----------------------------------------------
   ACCORDION (ONE OPEN AT A TIME)
---------------------------------------------- */
function openAccordion(targetId) {
  document.querySelectorAll(".accordion-item").forEach(item => {
    const header = item.querySelector(".accordion-header");
    const body = item.querySelector(".accordion-body");
    const id = body.id;

    if (id === targetId) {
      body.style.display = "block";
      header.classList.add("active");
    } else {
      body.style.display = "none";
      header.classList.remove("active");
    }
  });
}

/* ----------------------------------------------
   LOAD CONTINENT JSON
---------------------------------------------- */
async function loadContinent(continentKey) {
  try {
    const file = CONTINENT_FILES[continentKey];
    const res = await fetch(file, { cache: "no-store" });

    if (!res.ok) throw new Error("HTTP " + res.status);

    CURRENT_CONTINENT_DATA = await res.json();
    buildCountries();
    openAccordion("panel-countries");

  } catch (err) {
    console.error("Failed to load continent:", continentKey, err);
  }
}

/* ----------------------------------------------
   BUILD CONTINENT LIST (STATIC)
---------------------------------------------- */
function buildContinents() {
  const panel = document.getElementById("panel-continents");
  panel.innerHTML = "";

  Object.keys(CONTINENT_FILES).forEach(key => {
    const div = document.createElement("div");
    div.className = "nav-item";
    div.textContent =
      key.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());

    div.onclick = () => loadContinent(key);
    panel.appendChild(div);
  });
}

/* ----------------------------------------------
   BUILD COUNTRIES
---------------------------------------------- */
function buildCountries() {
  const panel = document.getElementById("panel-countries");
  panel.innerHTML = "";

  const countries = Object.keys(CURRENT_CONTINENT_DATA);

  countries.forEach(code => {
    const div = document.createElement("div");
    div.className = "nav-item";
    div.textContent = CURRENT_CONTINENT_DATA[code].country_name;

    div.onclick = () => buildLeagues(code);
    panel.appendChild(div);
  });
}

/* ----------------------------------------------
   BUILD LEAGUES
---------------------------------------------- */
function buildLeagues(countryCode) {
  const leagues = CURRENT_CONTINENT_DATA[countryCode]?.leagues || [];
  const panel = document.getElementById("panel-leagues");
  panel.innerHTML = "";

  leagues.forEach(league => {
    const div = document.createElement("div");
    div.className = "nav-item";
    div.textContent = league.display_name;

    div.onclick = () => buildTeams(league);
    panel.appendChild(div);
  });

  openAccordion("panel-leagues");
}

/* ----------------------------------------------
   BUILD TEAMS
---------------------------------------------- */
function buildTeams(league) {
  const teams = league.teams || [];
  const panel = document.getElementById("panel-teams");
  panel.innerHTML = "";

  teams.forEach(team => {
    const div = document.createElement("div");
    div.className = "nav-item";
    div.textContent = team;

    div.onclick = () => showTeam(team, league);
    panel.appendChild(div);
  });

  openAccordion("panel-teams");
}

/* ----------------------------------------------
   SHOW TEAM DETAILS
---------------------------------------------- */
function showTeam(team, league) {
  const panel = document.getElementById("panel-details");
  panel.innerHTML = `
    <div class="glass-card">
      <h3>${team}</h3>
      <div class="text-muted">${league.display_name}</div>
    </div>
  `;

  openAccordion("panel-details");
}

/* ----------------------------------------------
   MAIN INIT
---------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  buildContinents();
  openAccordion("panel-continents");
});
