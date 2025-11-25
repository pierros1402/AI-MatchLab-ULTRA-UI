// ================================================================
// AI MATCHLAB ULTRA – FRONTEND ENGINE (v2.1 ULTRA)
// - Χρησιμοποιεί /data/continents.json (με key "continents")
// - Continent → Country → League → Matches
// - Γεμίζει: League Info / Country Info / Competition Info / Standings / Insights
// - Tabs: live / upcoming / recent / smartmoney / matrix (UI-level handling)
// ================================================================

const CONTINENTS_PATH = "/data/continents.json";
const MAIN_WORKER_BASE = "https://aimatchlab-main.pierros1402.workers.dev";

// -----------------------
// 0. GLOBAL STATE
// -----------------------

const AIML_STATE = {
  continents: [],
  currentContinent: null,
  currentCountry: null,
  currentLeague: null,
  currentTab: "live",
  autoRefreshInterval: null
};

// -----------------------
// 1. DOM REFERENCES
// -----------------------

const dom = {
  continentSelect: document.getElementById("continentSelect"),
  countrySelect: document.getElementById("countrySelect"),
  leagueSelect: document.getElementById("leagueSelect"),

  matchesContainer: document.getElementById("matchesContainer"),
  leagueInfoContainer: document.getElementById("leagueInfoContainer"),
  countryInfoContainer: document.getElementById("countryInfoContainer"),
  competitionInfoContainer: document.getElementById("competitionInfoContainer"),
  standingsContainer: document.getElementById("standingsContainer"),
  insightsContainer: document.getElementById("insightsContainer"),

  autoRefreshStatus: document.getElementById("autoRefreshStatus"),
  installBtn: document.getElementById("installBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),

  updateBar: document.getElementById("updateBar"),
  reloadBtn: document.getElementById("reloadBtn"),

  footerYear: document.getElementById("footerYear"),
  footerVersion: document.getElementById("footerVersion"),
  appVersion: document.getElementById("appVersion"),

  footerLegalBtn: document.getElementById("footerLegalBtn")
};

// -----------------------
// 2. HELPER: JSON LOADER
// -----------------------

async function loadJSON(path) {
  try {
    const res = await fetch(path + "?v=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
    return await res.json();
  } catch (err) {
    console.error("JSON Load Error:", path, err);
    return null;
  }
}

// -----------------------
// 3. INIT APP
// -----------------------

async function initApp() {
  setupTabs();
  setupThemeToggle();
  setupRefreshButton();
  setupInstallPrompt();
  setupFooterMeta();

  // Optionally: mark matchesContainer as "card-match" for styling
  if (dom.matchesContainer) {
    dom.matchesContainer.classList.add("ml-card-match");
  }

  await initContinents();

  startAutoRefresh();
}

// -----------------------
// 4. CONTINENTS INIT
// -----------------------

async function initContinents() {
  const data = await loadJSON(CONTINENTS_PATH);
  if (!data || !Array.isArray(data.continents)) {
    console.error("Invalid continents.json structure. Expected { continents: [...] }");
    return;
  }

  AIML_STATE.continents = data.continents.slice();

  populateContinentsSelect();
  wireSelectHandlers();

  // Προσπάθεια default: Europe (EU), αλλιώς πρώτη ήπειρος
  const europe = AIML_STATE.continents.find(c => c.continent_code === "EU");
  if (europe) {
    dom.continentSelect.value = "EU";
    onContinentChanged();
  } else if (AIML_STATE.continents.length > 0) {
    dom.continentSelect.value = AIML_STATE.continents[0].continent_code;
    onContinentChanged();
  }
}

// -----------------------
// 5. POPULATE CONTINENTS
// -----------------------

function populateContinentsSelect() {
  if (!dom.continentSelect) return;

  dom.continentSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select Continent";
  dom.continentSelect.appendChild(placeholder);

  AIML_STATE.continents.forEach(cont => {
    const opt = document.createElement("option");
    opt.value = cont.continent_code;
    opt.textContent = cont.continent_name;
    dom.continentSelect.appendChild(opt);
  });
}

// -----------------------
// 6. WIRE SELECT HANDLERS
// -----------------------

function wireSelectHandlers() {
  if (dom.continentSelect) {
    dom.continentSelect.addEventListener("change", onContinentChanged);
  }
  if (dom.countrySelect) {
    dom.countrySelect.addEventListener("change", onCountryChanged);
  }
  if (dom.leagueSelect) {
    dom.leagueSelect.addEventListener("change", onLeagueChanged);
  }
}

// -----------------------
// 7. CONTINENT CHANGE
// -----------------------

function onContinentChanged() {
  const code = dom.continentSelect.value;

  AIML_STATE.currentLeague = null;
  AIML_STATE.currentCountry = null;
  AIML_STATE.currentContinent =
    AIML_STATE.continents.find(c => c.continent_code === code) || null;

  populateCountriesSelect();
  rebuildLeagueOptions();
  updateCountryInfoPanel();
  updateLeagueInfoPanel();
  updateCompetitionInfoPanel();
  updateStandingsPanel();
  updateInsightsPanel();
  clearMatchesIfNoLeague();
}

// -----------------------
// 8. POPULATE COUNTRIES
// -----------------------

function populateCountriesSelect() {
  if (!dom.countrySelect) return;

  dom.countrySelect.innerHTML = "";

  const allOpt = document.createElement("option");
  allOpt.value = "ALL";
  allOpt.textContent = "All Countries";
  dom.countrySelect.appendChild(allOpt);

  const cont = AIML_STATE.currentContinent;
  if (!cont || !Array.isArray(cont.countries)) return;

  const sortedCountries = cont.countries
    .filter(c => c.country_code && c.country_name)
    .sort((a, b) => a.country_name.localeCompare(b.country_name));

  sortedCountries.forEach(country => {
    const opt = document.createElement("option");
    opt.value = country.country_code;
    opt.textContent = country.country_name;
    dom.countrySelect.appendChild(opt);
  });

  dom.countrySelect.value = "ALL";
}

// -----------------------
// 9. COUNTRY CHANGE
// -----------------------

function onCountryChanged() {
  const code = dom.countrySelect.value;
  const cont = AIML_STATE.currentContinent;

  if (!cont) return;

  if (code === "ALL" || !code) {
    AIML_STATE.currentCountry = null;
  } else {
    AIML_STATE.currentCountry =
      (cont.countries || []).find(c => c.country_code === code) || null;
  }

  AIML_STATE.currentLeague = null;

  rebuildLeagueOptions();
  updateCountryInfoPanel();
  updateLeagueInfoPanel();
  updateCompetitionInfoPanel();
  updateStandingsPanel();
  updateInsightsPanel();
  clearMatchesIfNoLeague();
}

// -----------------------
// 10. REBUILD LEAGUE OPTIONS
// -----------------------

function rebuildLeagueOptions() {
  if (!dom.leagueSelect) return;

  dom.leagueSelect.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "ALL";
  allOpt.textContent = "All Leagues";
  dom.leagueSelect.appendChild(allOpt);

  const cont = AIML_STATE.currentContinent;
  if (!cont || !Array.isArray(cont.countries)) return;

  let countriesToUse = [];

  if (AIML_STATE.currentCountry) {
    countriesToUse = [AIML_STATE.currentCountry];
  } else {
    countriesToUse = cont.countries;
  }

  const leagueMap = new Map();

  countriesToUse.forEach(country => {
    (country.leagues || []).forEach(league => {
      if (!league.league_id) return;
      if (!league.display_name) return;
      if (!leagueMap.has(league.league_id)) {
        leagueMap.set(league.league_id, { league, country });
      }
    });
  });

  const leagueEntries = Array.from(leagueMap.values()).sort((a, b) =>
    a.league.display_name.localeCompare(b.league.display_name)
  );

  leagueEntries.forEach(entry => {
    const opt = document.createElement("option");
    opt.value = entry.league.league_id;
    opt.textContent = entry.league.display_name;
    dom.leagueSelect.appendChild(opt);
  });

  dom.leagueSelect.value = "ALL";
}

// -----------------------
// 11. LEAGUE CHANGE
// -----------------------

function onLeagueChanged() {
  const leagueId = dom.leagueSelect.value;
  const cont = AIML_STATE.currentContinent;

  AIML_STATE.currentLeague = null;

  if (!cont || !leagueId || leagueId === "ALL") {
    updateLeagueInfoPanel();
    updateCompetitionInfoPanel();
    updateStandingsPanel();
    updateInsightsPanel();
    clearMatchesIfNoLeague();
    return;
  }

  let found = null;
  let foundCountry = null;

  (cont.countries || []).forEach(country => {
    (country.leagues || []).forEach(league => {
      if (league.league_id === leagueId && !found) {
        found = league;
        foundCountry = country;
      }
    });
  });

  if (!found) {
    updateLeagueInfoPanel();
    updateCompetitionInfoPanel();
    updateStandingsPanel();
    updateInsightsPanel();
    clearMatchesIfNoLeague();
    return;
  }

  AIML_STATE.currentLeague = {
    league: found,
    country: foundCountry,
    continent: cont
  };

  updateLeagueInfoPanel();
  updateCompetitionInfoPanel();
  updateStandingsPanel();
  updateInsightsPanel();
  loadMatchesForCurrentLeague();
}

// -----------------------
// 12. MATCHES LOADER
// -----------------------

async function loadMatchesForCurrentLeague(isAutoRefresh = false) {
  const stateLeague = AIML_STATE.currentLeague;
  if (!stateLeague || !stateLeague.league) {
    clearMatchesIfNoLeague();
    return;
  }

  const leagueId = stateLeague.league.league_id;
  const tab = AIML_STATE.currentTab || "live";

  if (!dom.matchesContainer) return;

  if (!isAutoRefresh) {
    dom.matchesContainer.innerHTML = `
      <div class="ml-placeholder">
        <p>Loading ${tab} matches for ${stateLeague.league.display_name}...</p>
      </div>
    `;
  }

  try {
    // Βασικό endpoint – μπορείς να το προσαρμόσεις αν αλλάξει ο worker
    const url = `${MAIN_WORKER_BASE}/live?league=${encodeURIComponent(
      leagueId
    )}&source=A&tab=${encodeURIComponent(tab)}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      dom.matchesContainer.innerHTML = `
        <div class="ml-placeholder">
          <p>Unable to load matches (HTTP ${res.status}).</p>
        </div>`;
      return;
    }

    const json = await res.json();

    // Περιμένουμε κάτι σαν { matches: [...] }, αλλιώς placeholder
    const matches = Array.isArray(json.matches) ? json.matches : [];

    if (!matches.length) {
      dom.matchesContainer.innerHTML = `
        <div class="ml-placeholder">
          <p>No ${tab} matches available for this league.</p>
        </div>`;
      return;
    }

    renderMatchesList(matches);
  } catch (err) {
    console.error("Error loading matches:", err);
    dom.matchesContainer.innerHTML = `
      <div class="ml-placeholder">
        <p>Error loading matches. Please try again.</p>
      </div>`;
  }
}

function clearMatchesIfNoLeague() {
  if (!dom.matchesContainer) return;
  dom.matchesContainer.innerHTML = `
    <div class="ml-placeholder">
      <p>Select a league to load matches.</p>
    </div>
  `;
}

// -----------------------
// 13. RENDER MATCHES
// -----------------------

function renderMatchesList(matches) {
  if (!dom.matchesContainer) return;

  dom.matchesContainer.innerHTML = "";

  matches.forEach(m => {
    const row = document.createElement("div");
    row.className = "ml-match-row";

    const home = m.home || m.home_team || "Home";
    const away = m.away || m.away_team || "Away";
    const score = m.score || m.result || "-";
    const status = m.status || m.state || "Scheduled";
    const kickoff = m.kickoff || m.time || "";

    const metaStatus = status.toUpperCase();
    const metaTime = kickoff ? kickoff : "";

    row.innerHTML = `
      <div class="ml-match-teams">
        <div class="ml-team-line">
          <span>${home}</span>
          <span>${formatScorePart(score, "home")}</span>
        </div>
        <div class="ml-team-line">
          <span>${away}</span>
          <span>${formatScorePart(score, "away")}</span>
        </div>
      </div>
      <div class="ml-match-meta">
        <span>${metaStatus}</span>
        <span>${metaTime}</span>
      </div>
    `;

    dom.matchesContainer.appendChild(row);
  });
}

function formatScorePart(score, side) {
  if (!score || typeof score !== "string") return "-";
  const parts = score.split("-");
  if (parts.length !== 2) return score;
  return side === "home" ? parts[0].trim() : parts[1].trim();
}

// -----------------------
// 14. INFO PANELS
// -----------------------

function updateLeagueInfoPanel() {
  if (!dom.leagueInfoContainer) return;

  const st = AIML_STATE;
  const block = st.currentLeague;

  if (!block) {
    dom.leagueInfoContainer.innerHTML = `
      <div class="ml-placeholder small">
        <p>Select a league to view information.</p>
      </div>
    `;
    return;
  }

  const { league, country, continent } = block;

  const tier = league.tier != null ? league.tier : "N/A";
  const cluster = country.region_cluster || "-";
  const tz = country.timezone || "-";

  dom.leagueInfoContainer.innerHTML = `
    <div class="ml-info-block">
      <p><strong>League:</strong> ${league.display_name}</p>
      <p><strong>Tier:</strong> ${tier}</p>
      <p><strong>Country:</strong> ${country.country_name}</p>
      <p><strong>Continent:</strong> ${continent.continent_name}</p>
      <p><strong>Region Cluster:</strong> ${cluster}</p>
      <p><strong>Timezone:</strong> ${tz}</p>
      <p><strong>Code:</strong> ${league.league_id}</p>
    </div>
  `;
}

function updateCountryInfoPanel() {
  if (!dom.countryInfoContainer) return;

  const st = AIML_STATE;
  const cont = st.currentContinent;

  if (!cont) {
    dom.countryInfoContainer.innerHTML = `
      <div class="ml-placeholder small">
        <p>Select a continent to view country information.</p>
      </div>
    `;
    return;
  }

  if (!st.currentCountry) {
    // ALL countries of continent
    const totalCountries = (cont.countries || []).length;
    const totalLeagues = (cont.countries || []).reduce(
      (acc, c) => acc + (c.leagues ? c.leagues.length : 0),
      0
    );

    dom.countryInfoContainer.innerHTML = `
      <div class="ml-info-block">
        <p><strong>Continent:</strong> ${cont.continent_name}</p>
        <p><strong>Total Countries:</strong> ${totalCountries}</p>
        <p><strong>Total Leagues:</strong> ${totalLeagues}</p>
      </div>
    `;
    return;
  }

  const c = st.currentCountry;

  const leaguesCount = (c.leagues || []).length;
  const tz = c.timezone || "-";
  const cluster = c.region_cluster || "-";

  dom.countryInfoContainer.innerHTML = `
    <div class="ml-info-block">
      <p><strong>Country:</strong> ${c.country_name}</p>
      <p><strong>Code:</strong> ${c.country_code}</p>
      <p><strong>Timezone:</strong> ${tz}</p>
      <p><strong>Region Cluster:</strong> ${cluster}</p>
      <p><strong>Leagues:</strong> ${leaguesCount}</p>
    </div>
  `;
}

function inferCompetitionType(leagueId) {
  if (!leagueId) return "Domestic Competition";
  const id = leagueId.toUpperCase();

  if (id.endsWith("CUP")) return "Domestic Cup";
  if (id.endsWith("SUP") || id.endsWith("SC")) return "Super Cup";
  if (id.includes("U20") || id.includes("U19") || id.includes("U21"))
    return "Youth Competition";
  return "Domestic League";
}

function updateCompetitionInfoPanel() {
  if (!dom.competitionInfoContainer) return;

  const st = AIML_STATE;
  const block = st.currentLeague;

  if (!block) {
    dom.competitionInfoContainer.innerHTML = `
      <div class="ml-placeholder small">
        <p>Select a league or region to view competition details.</p>
      </div>
    `;
    return;
  }

  const { league, country, continent } = block;
  const type = inferCompetitionType(league.league_id);
  const tier = league.tier != null ? league.tier : "N/A";

  dom.competitionInfoContainer.innerHTML = `
    <div class="ml-info-block">
      <p><strong>Competition:</strong> ${league.display_name}</p>
      <p><strong>Type:</strong> ${type}</p>
      <p><strong>Tier:</strong> ${tier}</p>
      <p><strong>Nation:</strong> ${country.country_name}</p>
      <p><strong>Confed / Region:</strong> ${continent.continent_name}</p>
      <p><strong>Internal Code:</strong> ${league.league_id}</p>
    </div>
  `;
}

function updateStandingsPanel() {
  if (!dom.standingsContainer) return;

  const st = AIML_STATE;
  const block = st.currentLeague;

  if (!block) {
    dom.standingsContainer.innerHTML = `
      <div class="ml-placeholder small">
        <p>League standings will appear here.</p>
      </div>
    `;
    return;
  }

  const { league, country } = block;

  // Πλήρως έτοιμο panel για μελλοντική live σύνδεση.
  dom.standingsContainer.innerHTML = `
    <div class="ml-info-block">
      <p><strong>Standings Source:</strong> Not yet connected</p>
      <p>When integrated, table for <strong>${league.display_name}</strong> (${country.country_name}) will be shown here.</p>
    </div>
  `;
}

function updateInsightsPanel() {
  if (!dom.insightsContainer) return;

  const st = AIML_STATE;
  const block = st.currentLeague;

  if (!block) {
    dom.insightsContainer.innerHTML = `
      <div class="ml-placeholder small">
        <p>Insights / xG / SmartMoney will appear here.</p>
      </div>
    `;
    return;
  }

  const { league, country } = block;
  const tier = league.tier != null ? league.tier : "N/A";

  dom.insightsContainer.innerHTML = `
    <div class="ml-info-block">
      <p><strong>Insights Profile:</strong></p>
      <p>League: <strong>${league.display_name}</strong></p>
      <p>Country: ${country.country_name}</p>
      <p>Tier: ${tier}</p>
      <p>Tab Mode: ${AIML_STATE.currentTab.toUpperCase()}</p>
      <p class="ml-text-soft">This panel is ready for future integration of xG, SmartMoney and advanced signals.</p>
    </div>
  `;
}

// -----------------------
// 15. TABS HANDLING
// -----------------------

function setupTabs() {
  const tabs = document.querySelectorAll(".ml-tab");
  if (!tabs.length) return;

  tabs.forEach(tabBtn => {
    tabBtn.addEventListener("click", () => {
      const mode = tabBtn.getAttribute("data-tab") || "live";
      AIML_STATE.currentTab = mode;

      tabs.forEach(b => b.classList.remove("ml-tab-active"));
      tabBtn.classList.add("ml-tab-active");

      // Αν υπάρχει ήδη league, ξαναφορτώνουμε matches για αυτό το tab
      if (AIML_STATE.currentLeague) {
        loadMatchesForCurrentLeague();
        updateInsightsPanel();
      }
    });
  });
}

// -----------------------
// 16. THEME TOGGLE
// -----------------------

function setupThemeToggle() {
  if (!dom.themeToggleBtn) return;
  const html = document.documentElement;

  function applyThemeIcon() {
    const theme = html.getAttribute("data-theme") || "dark";
    dom.themeToggleBtn.textContent = theme === "dark" ? "🌗" : "☀";
  }

  dom.themeToggleBtn.addEventListener("click", () => {
    const current = html.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    applyThemeIcon();
  });

  applyThemeIcon();
}

// -----------------------
// 17. REFRESH BUTTON
// -----------------------

function setupRefreshButton() {
  if (!dom.refreshBtn) return;

  dom.refreshBtn.addEventListener("click", () => {
    if (AIML_STATE.currentLeague) {
      loadMatchesForCurrentLeague();
    } else if (AIML_STATE.currentContinent) {
      onContinentChanged();
    } else {
      initContinents();
    }
  });
}

// -----------------------
// 18. AUTO REFRESH
// -----------------------

function startAutoRefresh() {
  if (!dom.autoRefreshStatus) return;

  if (AIML_STATE.autoRefreshInterval) {
    clearInterval(AIML_STATE.autoRefreshInterval);
  }

  const dot = dom.autoRefreshStatus.querySelector(".dot");
  const label = dom.autoRefreshStatus.querySelector(".label");

  function markActive() {
    if (label) label.textContent = "auto-refresh ON";
  }

  markActive();

  AIML_STATE.autoRefreshInterval = setInterval(() => {
    if (AIML_STATE.currentLeague) {
      loadMatchesForCurrentLeague(true);
      if (dot) {
        dot.classList.add("active");
        setTimeout(() => dot.classList.remove("active"), 900);
      }
    }
  }, 60000); // κάθε 60"
}

// -----------------------
// 19. INSTALL PROMPT (PWA-LITE)
// -----------------------

let deferredPrompt = null;

function setupInstallPrompt() {
  if (!dom.installBtn) return;

  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
    dom.installBtn.classList.remove("ml-hidden");
  });

  dom.installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    dom.installBtn.classList.add("ml-hidden");
  });
}

// -----------------------
// 20. FOOTER META
// -----------------------

function setupFooterMeta() {
  if (dom.footerYear) {
    dom.footerYear.textContent = new Date().getFullYear();
  }
  if (dom.footerVersion && dom.appVersion) {
    dom.footerVersion.textContent = "Build " + dom.appVersion.textContent;
  }

  if (dom.footerLegalBtn) {
    dom.footerLegalBtn.addEventListener("click", () => {
      alert(
        "AI MatchLab ULTRA – Professional Football Intelligence.\nData sources and betting integrations are for informational purposes only."
      );
    });
  }

  if (dom.reloadBtn && dom.updateBar) {
    dom.reloadBtn.addEventListener("click", () => {
      window.location.reload();
    });
  }
}

// -----------------------
// BOOT
// -----------------------

document.addEventListener("DOMContentLoaded", initApp);
