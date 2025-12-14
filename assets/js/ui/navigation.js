// ======================================================================
// navigation.js — AI MatchLab ULTRA (GLOBAL SCRIPTS, NO MODULES)
// Continents → Countries → Leagues (from per-continent betting_ready FINAL files)
// Uses stable openAccordion() from accordion.js (NO duplicate openAccordion here)
// Emits: league-selected { id, name, ...context } for matches-panel.js
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

  let _continents = null;                // array
  const _continentCache = Object.create(null); // code -> array of countries

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

  function mustPanel(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`[NAV] Missing #${id} in DOM`);
    return el;
  }

  function setPanelMessage(panelId, msg) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    panel.innerHTML = `<div class="nav-empty">${escapeHtml(msg)}</div>`;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function makeItem(text, onClick) {
    const div = document.createElement("div");
    div.className = "nav-item";
    div.textContent = text;
    div.onclick = onClick;
    return div;
  }

  // ----------------------------
  // League ordering (yesterday plan):
  // 1) Divisions (tier asc)
  // 2) Cups after divisions
  // 3) Women
  // 4) Youth/Reserves
  // Then tie-breakers (England priority, then alpha)
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

    // order: divisions first
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

    // England special ordering inside same (group,tier)
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
      _continents = await fetchJson(URL_CONTINENTS);

      renderContinents();

      safeOpen("panel-continents");
    } catch (e) {
      console.error("[NAV] init failed:", e);
      setPanelMessage("panel-continents", "Failed to load continents.json. Check console.");
    }
  };

  function renderContinents() {
    const panel = mustPanel("panel-continents");
    panel.innerHTML = "";

    _continents.forEach((c) => {
      const label = c.name;
      panel.appendChild(makeItem(label, () => onContinentSelected(c)));
    });

    setPanelMessage("panel-countries", "Select a continent.");
    setPanelMessage("panel-leagues", "Select a country.");
  }

  async function loadContinentCountries(code) {
    if (_continentCache[code]) return _continentCache[code];

    const url = CONTINENT_DATA[code];
    if (!url) return [];

    const arr = await fetchJson(url);
    // expected: array of { country_code, country_name, leagues:[{league_id,display_name,tier},...] }
    _continentCache[code] = Array.isArray(arr) ? arr : [];
    return _continentCache[code];
  }

  async function onContinentSelected(continentObj) {
    const code = continentObj.code;
    console.log("[NAV] continent-selected:", code, continentObj.name);

    setPanelMessage("panel-countries", "Loading countries...");
    setPanelMessage("panel-leagues", "Select a country.");

    let countries;
    try {
      countries = await loadContinentCountries(code);
    } catch (e) {
      console.error("[NAV] failed loading continent file:", code, e);
      setPanelMessage("panel-countries", `Failed to load ${code} dataset. Check path in CONTINENT_DATA.`);
      safeOpen("panel-countries");
      return;
    }

    renderCountriesFromArray(code, continentObj.name, countries);
    safeOpen("panel-countries");
  }

  function renderCountriesFromArray(continentCode, continentName, countriesArray) {
    const panel = mustPanel("panel-countries");
    panel.innerHTML = "";

    const sorted = (countriesArray || [])
      .slice()
      .sort((a, b) => String(a.country_name || "").localeCompare(String(b.country_name || "")));

    sorted.forEach((c) => {
      panel.appendChild(makeItem(c.country_name, () => onCountrySelected(continentCode, continentName, c)));
    });

    if (!sorted.length) {
      setPanelMessage("panel-countries", "No countries found for this continent dataset.");
    }
  }

  function onCountrySelected(continentCode, continentName, countryObj) {
    const countryCode = countryObj.country_code;
    const countryName = countryObj.country_name;

    console.log("[NAV] country-selected:", countryCode, countryName);

    const rawLeagues = Array.isArray(countryObj.leagues) ? countryObj.leagues : [];

    // Debug count (to prove “missing leagues” is UI vs data)
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
  }

  function renderLeagues(leagues, context) {
    const panel = mustPanel("panel-leagues");
    panel.innerHTML = "";

    leagues.forEach((lg) => {
      const label = lg.name;
      panel.appendChild(
        makeItem(label, () => {
          console.log("[NAV] league-selected:", lg.id, lg.name);
          safeEmit("league-selected", { id: lg.id, name: lg.name, ...context });
        })
      );
    });

    if (!leagues.length) {
      setPanelMessage("panel-leagues", "No leagues found for this country.");
    }
  }

  // Auto-start (safe even if app.js also calls loadNavigation)
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof window.loadNavigation === "function") window.loadNavigation();
  });
})();
