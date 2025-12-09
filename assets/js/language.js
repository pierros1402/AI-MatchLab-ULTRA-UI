/* ============================================================
   AI MATCHLAB ULTRA — LANGUAGE ENGINE (EN + GR)
============================================================ */

const LANG_KEY = "AIML_UI_LANG";
const LANGUAGES = ["en", "el"];

const T = {
  en: {
    appTitle: "AI MATCHLAB ULTRA",
    appVersion: "v2.2 · Global Live Lab",
    navContinents: "Continents",
    navCountries: "Countries",
    navLeagues: "Leagues",
    navTeams: "Teams",
    navMatches: "Matches",
    navDetails: "Details",
    greekPanel: "Greek Panel · Bet365 · Stoiximan · OPAP",
    betfairPanel: "Betfair Exchange · Sharp Money",
    euPanel: "European Panel · WH · Ladbrokes · Unibet · Pinnacle · Bwin",
    asianPanel: "Asian Panel · Pinnacle · 188BET · SBO · 12BET · MaxBet"
  },
  el: {
    appTitle: "AI MATCHLAB ULTRA",
    appVersion: "v2.2 · Παγκόσμιο Live Lab",
    navContinents: "Ήπειροι",
    navCountries: "Χώρες",
    navLeagues: "Λίγκες",
    navTeams: "Ομάδες",
    navMatches: "Αγώνες",
    navDetails: "Λεπτομέρειες",
    greekPanel: "Ελληνικό Πάνελ · Bet365 · Stoiximan · ΟΠΑΠ",
    betfairPanel: "Betfair Exchange · Sharp Money",
    euPanel: "Ευρωπαϊκό Πάνελ · WH · Ladbrokes · Unibet · Pinnacle · Bwin",
    asianPanel: "Ασιατικό Πάνελ · Pinnacle · 188BET · SBO · 12BET · MaxBet"
  }
};

function nextLang(current) {
  const idx = LANGUAGES.indexOf(current);
  if (idx === -1 || idx === LANGUAGES.length - 1) return LANGUAGES[0];
  return LANGUAGES[idx + 1];
}

export function initLanguage() {
  let lang = localStorage.getItem(LANG_KEY) || "en";
  if (!LANGUAGES.includes(lang)) lang = "en";

  applyLang(lang);

  const btn = document.getElementById("btn-language");
  if (btn) {
    btn.addEventListener("click", () => {
      lang = nextLang(lang);
      localStorage.setItem(LANG_KEY, lang);
      applyLang(lang);
    });
  }
}

function applyLang(lang) {
  const t = T[lang] || T.en;

  const appTitle = document.querySelector(".app-title");
  const appVer = document.querySelector(".app-version");

  const hCont = document.querySelector('[data-target="panel-continents"]');
  const hCountries = document.querySelector('[data-target="panel-countries"]');
  const hLeagues = document.querySelector('[data-target="panel-leagues"]');
  const hTeams = document.querySelector('[data-target="panel-teams"]');
  const hMatches = document.querySelector('[data-target="panel-matches"]');
  const hDetails = document.querySelector('[data-target="panel-details"]');

  const greekH = document.querySelector("#panel-greek-odds .odds-header-row h3");
  const betfairH = document.querySelector("#panel-betfair-odds .odds-header-row h3");
  const euH = document.querySelector("#panel-eu-odds .odds-header-row h3");
  const asianH = document.querySelector("#panel-asian-odds .odds-header-row h3");

  if (appTitle) appTitle.textContent = t.appTitle;
  if (appVer) appVer.textContent = t.appVersion;
  if (hCont) hCont.textContent = t.navContinents;
  if (hCountries) hCountries.textContent = t.navCountries;
  if (hLeagues) hLeagues.textContent = t.navLeagues;
  if (hTeams) hTeams.textContent = t.navTeams;
  if (hMatches) hMatches.textContent = t.navMatches;
  if (hDetails) hDetails.textContent = t.navDetails;

  if (greekH) greekH.textContent = t.greekPanel;
  if (betfairH) betfairH.textContent = t.betfairPanel;
  if (euH) euH.textContent = t.euPanel;
  if (asianH) asianH.textContent = t.asianPanel;

  document.documentElement.lang = lang;
}
