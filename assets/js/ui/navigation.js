// ======================================================================
// navigation.js — AI MatchLab ULTRA (GLOBAL SCRIPTS, NO MODULES)
// Continents → Countries → Leagues
// v3.1: NO auto-open on boot + writes into *-list containers + league-binding ingest
// ======================================================================

(function () {
  "use strict";

  const DATA_BASE = "./AI-MATCHLAB-DATA";
  const URL_CONTINENTS = `${DATA_BASE}/indexes/continents.json`;

  const CONTINENT_DATA = {
    EU: `${DATA_BASE}/europe/europe_betting_ready_FINAL.json`,
    AF: `${DATA_BASE}/africa/africa_betting_ready_FINAL.json`,
    AS: `${DATA_BASE}/asia/asia_betting_ready_FINAL.json`,
    NA: `${DATA_BASE}/north_america/north_america_betting_ready_FINAL.json`,
    SA: `${DATA_BASE}/south_america/south_america_betting_ready_FINAL.json`,
    OC: `${DATA_BASE}/oceania/oceania_betting_ready_FINAL.json`,
    IN: `${DATA_BASE}/international/international_betting_ready_FINAL.json`
  };

  let _continents = null;
  const _continentCache = Object.create(null);

  function safeOpen(panelBodyId) {
    if (typeof window.openAccordion === "function") window.openAccordion(panelBodyId);
  }

  function safeEmit(name, payload) {
    if (typeof window.emit === "function") window.emit(name, payload);
    else console.error("[NAV] emit() missing — app.js must load first.");
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }

  function mustEl(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`[NAV] Missing #${id} in DOM`);
    return el;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setListMessage(listId, msg) {
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = `<div class="nav-empty">${escapeHtml(msg)}</div>`;
  }

  function makeItem(text, onClick) {
    const div = document.createElement("div");
    div.className = "nav-item";
    div.textContent = text;
    div.onclick = onClick;
    return div;
  }

  // ----------------------------
  // League sorting (your existing rules)
  // ----------------------------
  function leagueGroup(name, id) {
    const n = String(name || "");
    const i = String(id || "");

    const isYouth =
      /u\d{2}\b|u21|u23|u19|u18|youth|junior|development|reserve|reserves/i.test(n) ||
      /U\d{2}/.test(i);

    const isWomen =
      /\bwomen\b|wsl|femminile|frauen|kadınlar|kobiet|women's/i.test(n) ||
      /W\d/.test(i) || /W$/.test(i);

    const isCup =
      /\bcup\b|trophy|league cup|carabao|fa cup|coppa|copa|pokalen|taça|cup\b/i.test(n);

    if (!isCup && !isWomen && !isYouth) return 0;
    if (isCup) return 1;
    if (isWomen) return 2;
    if (isYouth) return 3;
    return 4;
  }

  const EN_PRIORITY = [
    /premier league/i,
    /championship/i,
    /\bleague one\b/i,
    /\bleague two\b/i,
    /national league\b/i,
    /national league north/i,
    /national league south/i
  ];

  function enPriorityScore(name) {
    const n = String(name || "");
    for (let k = 0; k < EN_PRIORITY.length; k++) {
      if (EN_PRIORITY[k].test(n)) return k;
    }
    return 999;
  }

  function normTier(t) {
    const x = Number(t);
    return Number.isFinite(x) ? x : 999;
  }

  function sortLeagues(countryCode, a, b) {
    const ga = leagueGroup(a.name, a.id);
    const gb = leagueGroup(b.name, b.id);
    if (ga !== gb) return ga - gb;

    const ta = normTier(a.tier);
    const tb = normTier(b.tier);
    if (ta !== tb) return ta - tb;

    if (countryCode === "EN") {
      const pa = enPriorityScore(a.name);
      const pb = enPriorityScore(b.name);
      if (pa !== pb) return pa - pb;
    }
    return String(a.name || "").localeCompare(String(b.name || ""));
  }

  // ----------------------------
  // Core flow
  // ----------------------------
  window.loadNavigation = async function loadNavigation() {
    try {
      // Ensure LeagueBinding is warm (Europe preload)
      if (window.LeagueBinding && typeof window.LeagueBinding.init === "function") {
        window.LeagueBinding.init({ preload: ["EU"] });
      }

      _continents = await fetchJson(URL_CONTINENTS);
      renderContinents();

      // IMPORTANT: no safeOpen("panel-continents") here (ALL CLOSED default)
    } catch (e) {
      console.error("[NAV] init failed:", e);
      setListMessage("continents-list", "Failed to load continents.json. Check console.");
    }
  };

  function renderContinents() {
    const list = mustEl("continents-list");
    list.innerHTML = "";

    (_continents || []).forEach((c) => {
      list.appendChild(makeItem(c.name, () => onContinentSelected(c)));
    });

    setListMessage("countries-list", "Select a continent.");
    setListMessage("leagues-list", "Select a country.");
  }

  async function loadContinentCountries(code) {
    if (_continentCache[code]) return _continentCache[code];

    const url = CONTINENT_DATA[code];
    if (!url) return [];

    const arr = await fetchJson(url);
    _continentCache[code] = Array.isArray(arr) ? arr : [];

    // Feed LeagueBinding from the SAME dataset the accordion uses
    if (window.LeagueBinding && typeof window.LeagueBinding.ingestContinentDataset === "function") {
      try {
        window.LeagueBinding.ingestContinentDataset(code, _continentCache[code]);
      } catch (e) {
        console.warn("[NAV] LeagueBinding ingest failed:", e);
      }
    }

    return _continentCache[code];
  }

  async function onContinentSelected(continentObj) {
    const code = continentObj.code;
    console.log("[NAV] continent-selected:", code, continentObj.name);

    setListMessage("countries-list", "Loading countries...");
    setListMessage("leagues-list", "Select a country.");

    let countries;
    try {
      countries = await loadContinentCountries(code);
    } catch (e) {
      console.error("[NAV] failed loading continent file:", code, e);
      setListMessage("countries-list", `Failed to load ${code} dataset. Check CONTINENT_DATA path.`);
      safeOpen("panel-countries");
      return;
    }

    renderCountriesFromArray(code, continentObj.name, countries);
    safeOpen("panel-countries");
    safeEmit("continent-selected", { code, name: continentObj.name });
  }

  function renderCountriesFromArray(continentCode, continentName, countriesArray) {
    const list = mustEl("countries-list");
    list.innerHTML = "";

    const sorted = (countriesArray || [])
      .slice()
      .sort((a, b) => String(a.country_name || "").localeCompare(String(b.country_name || "")));

    sorted.forEach((c) => {
      list.appendChild(makeItem(c.country_name, () => onCountrySelected(continentCode, continentName, c)));
    });

    if (!sorted.length) setListMessage("countries-list", "No countries found for this continent dataset.");
  }

  function onCountrySelected(continentCode, continentName, countryObj) {
    const countryCode = countryObj.country_code;
    const countryName = countryObj.country_name;

    console.log("[NAV] country-selected:", countryCode, countryName);

    const rawLeagues = Array.isArray(countryObj.leagues) ? countryObj.leagues : [];
    console.log("[NAV] leagues count:", countryName, rawLeagues.length);

    const leagues = rawLeagues
      .map((l) => ({
        id: l.league_id,
        name: l.display_name || l.league_id,
        tier: l.tier
      }))
      .filter((x) => x.id && x.name)
      .sort((a, b) => sortLeagues(countryCode, a, b));

    renderLeagues(leagues, {
      continent_code: continentCode,
      continent_name: continentName,
      country_code: countryCode,
      country_name: countryName
    });

    safeOpen("panel-leagues");
    safeEmit("country-selected", { continent_code: continentCode, country_code: countryCode, country_name: countryName });
  }

  function renderLeagues(leagues, context) {
    const list = mustEl("leagues-list");
    list.innerHTML = "";

    leagues.forEach((lg) => {
      list.appendChild(
        makeItem(lg.name, () => {
          console.log("[NAV] league-selected:", lg.id, lg.name);
          safeEmit("league-selected", { id: lg.id, name: lg.name, ...context });

          // Open matches panel on selection (stable UX)
          safeOpen("panel-matches");
        })
      );
    });

    if (!leagues.length) setListMessage("leagues-list", "No leagues found for this country.");
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof window.loadNavigation === "function") window.loadNavigation();
  });

})();
