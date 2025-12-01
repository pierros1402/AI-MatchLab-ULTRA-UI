/* FINAL APP.JS */

import {
    renderContinents,
    renderCountries,
    renderLeagues,
    renderTeams,
    renderMatches,
    renderDetails
} from "./render.js";

/* CONTINENTS */
const CONTINENTS = [
    { code: "Europe",        name: "Europe" },
    { code: "Africa",        name: "Africa" },
    { code: "Asia",          name: "Asia" },
    { code: "North America", name: "North America" },
    { code: "South America", name: "South America" },
    { code: "Oceania",       name: "Oceania" },
    { code: "International", name: "International" }
];

export function initApp() {
    console.log("[APP] Init");
    renderContinents(CONTINENTS);
    console.log("[APP] Ready");
}

// ❗ ΠΡΟΣΟΧΗ: ΑΦΑΙΡΕΣΑΜΕ το DOMContentLoaded
// Το initApp καλείται ΜΟΝΟ από το index.html
