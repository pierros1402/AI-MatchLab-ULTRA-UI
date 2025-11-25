// ================================================================
// AI MATCHLAB ULTRA – FRONTEND ENGINE (v2.1 ULTRA)
// - Χρησιμοποιεί /data/continents.json (με key "continents")
// - Continent → Country → League → Matches
// - Γεμίζει: League Info / Country Info / Competition Info / Standings / Insights
// - Tabs: live / upcoming / recent / smartmoney / matrix (UI-level handling)
// ================================================================

const CONTINENTS_PATH = "/data/continents.json";
const MAIN_WORKER_BASE = "https://aimatchlab-main.pierros1402.workers.dev";

// Base URL for external AI-MATCHLAB-DATA repository (leagues/teams indexes)
// Default points to future Cloudflare Pages deployment; can be overridden at runtime via window.AI_MATCHLAB_DATA_BASE
const AI_MATCHLAB_DATA_BASE = (typeof window !== "undefined" && window.AI_MATCHLAB_DATA_BASE)
  ? window.AI_MATCHLAB_DATA_BASE
  : "https://ai-matchlab-data.pages.dev";
const AI_MATCHLAB_LEAGUES_INDEX_URL = AI_MATCHLAB_DATA_BASE + "/indexes/leagues_index.json";

// -----------------------
// 0. GLOBAL STATE
// -----------------------

const AIML_STATE = {
  continents: [],
  currentContinent: null,
  currentCountry: null,
  currentLeague: null,
  currentTab: "live",
  autoRefreshInterval: null,
  leaguesIndex: null,
  leagueTeamsCache: {}
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

  tabButtons: document.querySelectorAll("[data-tab]"),
  tabLiveBtn: document.querySelector("[data-tab='live']"),
  tabUpcomingBtn: document.querySelector("[data-tab='upcoming']"),
  tabRecentBtn: document.querySelector("[data-tab='recent']"),
  tabSmartMoneyBtn: document.querySelector("[data-tab='smartmoney']"),
  tabMatrixBtn: document.querySelector("[data-tab='matrix']"),

  themeToggle: document.getElementById("themeToggle"),
  refreshButton: document.getElementById("refreshButton"),
  installBtn: document.getElementById("installBtn"),

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

  // Load core geographic structure (continents) + external leagues index in parallel
  await Promise.all([
    initContinents(),
    initLeaguesIndex()
  ]);

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
// 4b. LEAGUES INDEX INIT (AI-MATCHLAB-DATA)
// -----------------------

async function initLeaguesIndex() {
  const indexData = await loadJSON(AI_MATCHLAB_LEAGUES_INDEX_URL);
  if (!indexData || !indexData.leagues) {
    console.warn("AI-MATCHLAB-DATA leagues_index.json not available or invalid. Standings/teams list will show placeholder.");
    return;
  }
  AIML_STATE.leaguesIndex = indexData.leagues;
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

  dom.continentSelect.value = "";
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
  const continent = AIML_STATE.continents.find(c => c.continent_code === code) || null;

  AIML_STATE.currentContinent = continent;
  AIML_STATE.currentCountry = null;
  AIML_STATE.currentLeague = null;

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

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select Country";
  dom.countrySelect.appendChild(placeholder);

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

  if (code === "ALL") {
    AIML_STATE.currentCountry = null;
  } else {
    AIML_STATE.currentCountry = cont.countries.find(c => c.country_code === code) || null;
  }

  rebuildLeagueOptions();
  updateCountryInfoPanel();
  updateLeagueInfoPanel();
  updateCompetitionInfoPanel();
  updateStandingsPanel();
  updateInsightsPanel();
  clearMatchesIfNoLeague();
}

// -----------------------
// 10. REBUILD LEAGUES LIST
// -----------------------

function rebuildLeagueOptions() {
  if (!dom.leagueSelect) return;

  dom.leagueSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select League";
  dom.leagueSelect.appendChild(placeholder);

  const cont = AIML_STATE.currentContinent;
  if (!cont || !Array.isArray(cont.countries)) return;

  const countryFilter = AIML_STATE.currentCountry ? AIML_STATE.currentCountry.country_code : "ALL";

  let combinedLeagues = [];

  cont.countries.forEach(country => {
    if (!Array.isArray(country.leagues)) return;
    const cc = country.country_code;

    country.leagues.forEach(league => {
      if (!league.league_id) return;

      if (countryFilter === "ALL") {
        combinedLeagues.push({ country, league });
      } else if (cc === countryFilter) {
        combinedLeagues.push({ country, league });
      }
    });
  });

  combinedLeagues.sort((a, b) => {
    const an = (a.league.display_name || "").toLowerCase();
    const bn = (b.league.display_name || "").toLowerCase();
    return an.localeCompare(bn);
  });

  combinedLeagues.forEach(pair => {
    const { country, league } = pair;
    const opt = document.createElement("option");
    opt.value = league.league_id;
    opt.textContent = `${league.display_name} (${country.country_name})`;
    dom.leagueSelect.appendChild(opt);
  });

  dom.leagueSelect.value = "";
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

  cont.countries.forEach(country => {
    if (!Array.isArray(country.leagues)) return;
    country.leagues.forEach(league => {
      if (league.league_id === leagueId) {
        found = { country, league };
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

  AIML_STATE.currentLeague = found;

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
    const url = `${MAIN_WORKER_BASE}/matches?league_id=${encodeURIComponent(leagueId)}&tab=${encodeURIComponent(tab)}`;

    const res = await fetch(url + "&_ts=" + Date.now(), {
      cache: "no-store"
    });

    if (!res.ok) throw new Error(`Worker response ${res.status}`);

    const data = await res.json();

    const matches = Array.isArray(data.matches) ? data.matches : [];

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
        <p>Error loading matches for this league. Please try again.</p>
      </div>
    `;
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

  const tab = AIML_STATE.currentTab || "live";
  dom.matchesContainer.innerHTML = "";

  const list = document.createElement("div");
  list.className = "ml-matches-list";

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
        <span class="ml-match-status">${metaStatus}</span>
        <span class="ml-match-time">${metaTime}</span>
      </div>
    `;

    list.appendChild(row);
  });

  dom.matchesContainer.appendChild(list);
}

function formatScorePart(scoreStr, which) {
  if (!scoreStr || typeof scoreStr !== "string") return "-";
  const parts = scoreStr.split("-");
  if (parts.length !== 2) return scoreStr;

  if (which === "home") return parts[0].trim();
  if (which === "away") return parts[1].trim();
  return scoreStr;
}

// -----------------------
// 14. PANELS: LEAGUE INFO
// -----------------------

function updateLeagueInfoPanel() {
  if (!dom.leagueInfoContainer) return;

  const st = AIML_STATE;
  const block = st.currentLeague;

  if (!block) {
    dom.leagueInfoContainer.innerHTML = `
      <div class="ml-placeholder small">
        <p>Select a league to see details.</p>
      </div>
    `;
    return;
  }

  const { league, country } = block;

  dom.leagueInfoContainer.innerHTML = `
    <div class="ml-info-block">
      <h3>${league.display_name}</h3>
      <p><strong>Country:</strong> ${country.country_name}</p>
      <p><strong>League ID:</strong> ${league.league_id}</p>
      <p><strong>Tier:</strong> ${league.tier != null ? league.tier : "N/A"}</p>
      <p><strong>Importance:</strong> ${league.importance_score != null ? league.importance_score : "N/A"}</p>
    </div>
  `;
}

// -----------------------
// 15. PANELS: COUNTRY INFO
// -----------------------

function updateCountryInfoPanel() {
  if (!dom.countryInfoContainer) return;

  const st = AIML_STATE;
  const cont = st.currentContinent;
  const ctry = st.currentCountry;

  if (!ctry) {
    if (!cont) {
      dom.countryInfoContainer.innerHTML = `
        <div class="ml-placeholder small">
          <p>Select a continent to see country information.</p>
        </div>
      `;
      return;
    }

    const totalCountries = Array.isArray(cont.countries) ? cont.countries.length : 0;
    dom.countryInfoContainer.innerHTML = `
      <div class="ml-info-block">
        <h3>${cont.continent_name}</h3>
        <p><strong>Countries in dataset:</strong> ${totalCountries}</p>
        <p>Select a country from the dropdown to see more details.</p>
      </div>
    `;
    return;
  }

  const leagueCount = Array.isArray(ctry.leagues) ? ctry.leagues.length : 0;

  dom.countryInfoContainer.innerHTML = `
    <div class="ml-info-block">
      <h3>${ctry.country_name}</h3>
      <p><strong>Country Code:</strong> ${ctry.country_code}</p>
      <p><strong>Timezone:</strong> ${ctry.timezone || "N/A"}</p>
      <p><strong>Leagues in dataset:</strong> ${leagueCount}</p>
    </div>
  `;
}

// -----------------------
// 16. PANELS: COMPETITION INFO
// -----------------------

function updateCompetitionInfoPanel() {
  if (!dom.competitionInfoContainer) return;

  const st = AIML_STATE;
  const block = st.currentLeague;

  if (!block) {
    dom.competitionInfoContainer.innerHTML = `
      <div class="ml-placeholder small">
        <p>Competition info will appear when you select a league.</p>
      </div>
    `;
    return;
  }

  const { league, country } = block;
  const tier = league.tier != null ? league.tier : "N/A";
  const importance = league.importance_score != null ? league.importance_score : "N/A";

  dom.competitionInfoContainer.innerHTML = `
    <div class="ml-info-block">
      <p><strong>${league.display_name}</strong> (${country.country_name})</p>
      <p><strong>Tier:</strong> ${tier}</p>
      <p><strong>Importance Score:</strong> ${importance}</p>
      <p>Further competition-specific info (historic champions, format, etc.) can be added here.</p>
    </div>
  `;
}

// -----------------------
// 17. PANELS: STANDINGS (AI-MATCHLAB-DATA TEAMS)
// -----------------------

async function updateStandingsPanel() {
  if (!dom.standingsContainer) return;

  const st = AIML_STATE;
  const block = st.currentLeague;

  if (!block || !block.league) {
    dom.standingsContainer.innerHTML = `
      <div class="ml-placeholder small">
        <p>League standings / team list will appear here once you select a league.</p>
      </div>
    `;
    return;
  }

  const { league, country } = block;
  const leagueId = league.league_id;

  // If we don't yet have the external leagues index, show generic message
  if (!st.leaguesIndex || !st.leaguesIndex[leagueId]) {
    dom.standingsContainer.innerHTML = `
      <div class="ml-info-block">
        <p><strong>${league.display_name}</strong> (${country.country_name})</p>
        <p>Standings / teams are not yet connected to the external AI-MATCHLAB-DATA dataset for this league.</p>
      </div>
    `;
    return;
  }

  // Look up league path inside AI-MATCHLAB-DATA
  const leagueMeta = st.leaguesIndex[leagueId];
  const leaguePath = leagueMeta.path; // e.g. "/europe/teams/AL/ALB1.json"
  const cacheKey = leagueId;

  // Use small in-memory cache to avoid refetching the same league teams repeatedly
  let teamsData = st.leagueTeamsCache[cacheKey] || null;
  if (!teamsData) {
    const fullUrl = AI_MATCHLAB_DATA_BASE + leaguePath;
    teamsData = await loadJSON(fullUrl);
    if (!teamsData || !Array.isArray(teamsData.teams)) {
      dom.standingsContainer.innerHTML = `
        <div class="ml-info-block">
          <p><strong>${league.display_name}</strong> (${country.country_name})</p>
          <p>Could not load teams list from AI-MATCHLAB-DATA.</p>
        </div>
      `;
      return;
    }
    st.leagueTeamsCache[cacheKey] = teamsData;
  }

  const teams = teamsData.teams.slice().sort((a, b) => {
    const nameA = (a.name || "").toLowerCase();
    const nameB = (b.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const rowsHtml = teams.map((t, idx) => {
    const short = t.short_name || "";
    const alt = (t.alt_names && t.alt_names.length)
      ? `(${t.alt_names.join(", ")})`
      : "";
    return `
      <tr>
        <td>${idx + 1}</td>
        <td>${t.name}</td>
        <td>${short}</td>
        <td>${alt}</td>
      </tr>
    `;
  }).join("");

  dom.standingsContainer.innerHTML = `
    <div class="ml-info-block">
      <p><strong>${league.display_name}</strong> — Teams (${teams.length})</p>
      <div class="ml-standings-table-wrapper">
        <table class="ml-standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>Short</th>
              <th>Alt names</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
      <p class="ml-info-note">Source: AI-MATCHLAB-DATA (teams JSON)</p>
    </div>
  `;
}

// -----------------------
// 18. PANELS: INSIGHTS
// -----------------------

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
  const importance = league.importance_score != null ? league.importance_score : "N/A";

  dom.insightsContainer.innerHTML = `
    <div class="ml-info-block">
      <h3>Insights for ${league.display_name}</h3>
      <p><strong>Country:</strong> ${country.country_name}</p>
      <p><strong>Tier:</strong> ${tier}</p>
      <p><strong>Importance Score:</strong> ${importance}</p>
      <p>Advanced analytics (xG, SmartMoney, momentum, etc.) will be displayed here.</p>
    </div>
  `;
}

// -----------------------
// 19. TABS / THEME / REFRESH
// -----------------------

function setupTabs() {
  if (!dom.tabButtons) return;

  dom.tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");
      setActiveTab(tab);
    });
  });

  setActiveTab("live");
}

function setActiveTab(tab) {
  AIML_STATE.currentTab = tab || "live";

  dom.tabButtons.forEach(btn => {
    const t = btn.getAttribute("data-tab");
    if (t === AIML_STATE.currentTab) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  if (AIML_STATE.currentLeague) {
    loadMatchesForCurrentLeague(true);
  }
}

function setupThemeToggle() {
  if (!dom.themeToggle) return;

  dom.themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("theme-dark");
  });
}

function setupRefreshButton() {
  if (!dom.refreshButton) return;

  dom.refreshButton.addEventListener("click", () => {
    if (AIML_STATE.currentLeague) {
      loadMatchesForCurrentLeague(false);
    }
  });
}

let deferredInstallPrompt = null;

function setupInstallPrompt() {
  if (!dom.installBtn) return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    dom.installBtn.style.display = "inline-flex";
  });

  dom.installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    console.log("Install choice:", choice);
    deferredInstallPrompt = null;
    dom.installBtn.style.display = "none";
  });
}

function setupFooterMeta() {
  if (!dom.appVersion) return;
  dom.appVersion.textContent = "AI MATCHLAB ULTRA v2.1";
}

// -----------------------
// 20. AUTO REFRESH
// -----------------------

function startAutoRefresh() {
  if (AIML_STATE.autoRefreshInterval) {
    clearInterval(AIML_STATE.autoRefreshInterval);
  }
  AIML_STATE.autoRefreshInterval = setInterval(() => {
    if (AIML_STATE.currentLeague) {
      loadMatchesForCurrentLeague(true);
    }
  }, 60 * 1000);
}

// -----------------------
// 21. BOOTSTRAP
// -----------------------

document.addEventListener("DOMContentLoaded", initApp);
