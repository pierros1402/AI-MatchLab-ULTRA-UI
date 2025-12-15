// ====================================================================
// LEFT NAVIGATION RENDER ENGINE — COMPLETE
// ====================================================================
//
// Διαβάζει global_leagues_master.json
// Φτιάχνει Continent → Countries → Leagues
// Σωστά ονόματα, χωρίς indexes
//
// ====================================================================

import { initAccordion } from "./accordion.js";
import { selectLeague } from "./app.js";

const nav = document.getElementById("panel-leagues");

(async function loadNavigation() {
  const res = await fetch("/data/global_leagues_master.json");
  const data = await res.json();

  nav.innerHTML = renderContinents(data);
  initAccordion();
})();


// --------------------------------------------------------------------
// RENDER CONTINENTS
// --------------------------------------------------------------------
function renderContinents(data) {
  let html = "";

  for (const continentName in data) {
    const continent = data[continentName];

    html += `
      <div class="accordion-item">
        <div class="accordion-header continent-item" data-target="c_${continentName}">
          ${continentName}
        </div>
        <div class="accordion-body" id="c_${continentName}">
          ${renderCountries(continent)}
        </div>
      </div>
    `;
  }

  return html;
}


// --------------------------------------------------------------------
// RENDER COUNTRIES
// --------------------------------------------------------------------
function renderCountries(continent) {
  return continent.map(country => `
    <div class="accordion-item">
      <div class="accordion-header country-item" data-target="ct_${country.country_code}">
        <img src="/flags/${country.country_code}.svg" class="flag-sm"> 
        ${country.country_name}
      </div>
      <div class="accordion-body" id="ct_${country.country_code}">
        ${renderLeagues(country.leagues)}
      </div>
    </div>
  `).join("");
}


// --------------------------------------------------------------------
// RENDER LEAGUES
// --------------------------------------------------------------------
function renderLeagues(leagues) {
  return leagues.map(league => `
    <div class="league-item"
         onclick="selectLeague('${league.league_id}')">
        ${league.display_name}
    </div>
  `).join("");
}
