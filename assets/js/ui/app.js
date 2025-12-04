/* ============================================================
   AI MATCHLAB ULTRA — APP FINAL (SAFE VERSION)
   Flat Global Mode + Accordion Navigation + Teams Support
============================================================ */

import { buildTeams } from "./teams.js";

let GLOBAL = [];
let SELECTED = {
  continent: null,
  country: null,
  league: null,
};

/* ------------------------------------------------------------
   Safe Accordion Handler
------------------------------------------------------------ */
function openAccordion(targetId) {
  const items = document.querySelectorAll(".accordion-item");

  items.forEach((item) => {
    const header = item.querySelector(".accordion-header");
    const body = item.querySelector(".accordion-body");
    const id = body.getAttribute("id");

    if (id === targetId) {
      body.style.display = "block";
      header.classList.add("active");
    } else {
      body.style.display = "none";
      header.classList.remove("active");
    }
  });
}

/* ------------------------------------------------------------
   LOAD GLOBAL JSON
------------------------------------------------------------ */
async function loadGlobal() {
  try {
    const url = "/AI-MATCHLAB-DATA/indexes/global_leagues_master_FINAL.json";
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) throw new Error("HTTP " + res.status);

    GLOBAL = await res.json();

    if (!Array.isArray(GLOBAL) || GLOBAL.length === 0) {
      console.error("[APP] GLOBAL JSON is empty or invalid");
      return;
    }

    buildContinents();
    openAccordion("panel-continents");

  } catch (err) {
    console.error("[APP] Failed to load master JSON:", err);
  }
}

/* ------------------------------------------------------------
   BUILD CONTINENTS
------------------------------------------------------------ */
function buildContinents() {
  const panel = document.getElementById("panel-continents");
  panel.innerHTML = "";

  const continents = [
    ...new Set(GLOBAL.map(c => c.region_cluster.split("_")[0]))
  ].sort();

  continents.forEach(cont => {
    const div = document.createElement("div");
    div.className = "nav-item";
    div.textContent = cont;
    div.onclick = () => selectContinent(cont);
    panel.appendChild(div);
  });
}

/* ------------------------------------------------------------
   SELECT CONTINENT → COUNTRIES
------------------------------------------------------------ */
function selectContinent(continent) {
  SELECTED = { continent, country: null, league: null };

  const countries = GLOBAL.filter(c =>
    c.region_cluster.startsWith(continent)
  );

  buildCountries(countries);
  openAccordion("panel-countries");

  document.getElementById("panel-leagues").innerHTML = "";
  document.getElementById("panel-teams").innerHTML = "";
}

/* ------------------------------------------------------------
   BUILD COUNTRIES
------------------------------------------------------------ */
function buildCountries(list) {
  const panel = document.getElementById("panel-countries");
  panel.innerHTML = "";

  list.sort((a, b) => a.country_name.localeCompare(b.country_name));

  list.forEach(c => {
    const div = document.createElement("div");
    div.className = "nav-item";
    div.textContent = c.country_name;
    div.onclick = () => selectCountry(c.country_code);
    panel.appendChild(div);
  });
}

/* ------------------------------------------------------------
   SELECT COUNTRY → LEAGUES
------------------------------------------------------------ */
function selectCountry(code) {
  SELECTED.country = code;

  const country = GLOBAL.find(c => c.country_code === code);
  if (!country || !country.leagues) return;

  buildLeagues(country.leagues);
  openAccordion("panel-leagues");

  document.getElementById("panel-teams").innerHTML = "";
}

/* ------------------------------------------------------------
   BUILD LEAGUES
------------------------------------------------------------ */
function buildLeagues(leagues) {
  const panel = document.getElementById("panel-leagues");
  panel.innerHTML = "";

  leagues.sort((a, b) => {
    const isCupA = a.display_name.includes("Cup") || a.display_name.includes("Trophy");
    const isCupB = b.display_name.includes("Cup") || b.display_name.includes("Trophy");

    if (!isCupA && isCupB) return -1;
    if (isCupA && !isCupB) return 1;

    if (isCupA && isCupB) return a.display_name.localeCompare(b.display_name);

    if (a.tier !== b.tier) return a.tier - b.tier;

    return a.display_name.localeCompare(b.display_name);
  });

  leagues.forEach(l => {
    const div = document.createElement("div");
    div.className = "nav-item";
    div.textContent = l.display_name;
    div.onclick = () => selectLeague(l.league_id);
    panel.appendChild(div);
  });
}

/* ------------------------------------------------------------
   SELECT LEAGUE → TEAMS
------------------------------------------------------------ */
function selectLeague(id) {
  SELECTED.league = id;

  if (!SELECTED.country) {
    console.error("[APP] No country selected");
    return;
  }

  buildTeams(SELECTED.country, id);
  openAccordion("panel-teams");
}

/* ------------------------------------------------------------
   INIT
------------------------------------------------------------ */
window.addEventListener("DOMContentLoaded", loadGlobal);
