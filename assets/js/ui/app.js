/* ============================================================
   AI MATCHLAB ULTRA — APP (FLAT GLOBAL MODE + AUTO ACCORDION)
   Συμβατό 100% με index.html (panel-continents/panel-countries/panel-leagues)
============================================================ */

let GLOBAL = [];     
let SELECTED = {
    continent: null,
    country: null,
    league: null
};

/* ------------------------------------------------------------
   Helper: Open one accordion panel, close all others
------------------------------------------------------------ */
function openAccordion(targetId) {
    const items = document.querySelectorAll(".accordion-item");
    
    items.forEach(item => {
        const header = item.querySelector(".accordion-header");
        const body = item.querySelector(".accordion-body");
        const id = body.getAttribute("id");

        if (id === targetId) {
            // OPEN
            body.style.display = "block";
            header.classList.add("active");
        } else {
            // CLOSE
            body.style.display = "none";
            header.classList.remove("active");
        }
    });
}

/* ------------------------------------------------------------
   LOAD JSON
------------------------------------------------------------ */

async function loadGlobal() {
    try {
        console.log("[APP] Loading global flat JSON…");

        const res = await fetch("/AI-MATCHLAB-DATA/indexes/global_leagues_master_FINAL.json");
        GLOBAL = await res.json();

        console.log("[APP] Loaded", GLOBAL.length, "countries");

        buildContinents();

        // Open continents panel by default
        openAccordion("panel-continents");

    } catch (err) {
        console.error("[APP] Failed to load global JSON", err);
    }
}

/* ------------------------------------------------------------
   BUILD CONTINENTS
------------------------------------------------------------ */

function buildContinents() {
    const panel = document.getElementById("panel-continents");
    panel.innerHTML = "";

    const continents = [...new Set(
        GLOBAL.map(c => c.region_cluster.split("_")[0])
    )].sort();

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
    SELECTED.continent = continent;

    const countries = GLOBAL.filter(c =>
        c.region_cluster.startsWith(continent)
    );

    buildCountries(countries);

    // Auto open countries panel, close others
    openAccordion("panel-countries");

    document.getElementById("panel-leagues").innerHTML = "";
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
    buildLeagues(country.leagues);

    // Auto open leagues panel, close others
    openAccordion("panel-leagues");
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

        // 1) ΠΡΩΤΑ ΟΛΕΣ ΟΙ ΛΙΓΚΕΣ (δεν είναι cups)
        if (!isCupA && isCupB) return -1;
        if (isCupA && !isCupB) return 1;

        // 2) Αν είναι και οι δύο cups → αλφαβητικά
        if (isCupA && isCupB) {
            return a.display_name.localeCompare(b.display_name);
        }

        // 3) Αν είναι και οι δύο leagues → με σειρά tier
        if (a.tier !== b.tier) {
            return a.tier - b.tier;
        }

        // 4) Αν έχουν ίδιο tier → αλφαβητικά
        return a.display_name.localeCompare(b.display_name);
    });

    // --------------------------------------------------------
    // RENDER LEAGUES
    // --------------------------------------------------------
    leagues.forEach(l => {
        const div = document.createElement("div");
        div.className = "nav-item";
        div.textContent = l.display_name;
        div.onclick = () => selectLeague(l.league_id);
        panel.appendChild(div);
    });
}
/* ------------------------------------------------------------
   SELECT LEAGUE
------------------------------------------------------------ */

function selectLeague(id) {
    SELECTED.league = id;
    console.log("SELECTED LEAGUE:", id);
}

/* ------------------------------------------------------------
   INIT
------------------------------------------------------------ */

window.addEventListener("DOMContentLoaded", loadGlobal);
