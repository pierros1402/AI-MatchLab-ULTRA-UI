// ============================================================
// AI MatchLab ULTRA – Premium UI + Live Engine Integration
// Frontend for:
//   - Cloudflare worker: https://aimatchlab-main.pierros1402.workers.dev
//   - Unified endpoint:  /live-ultra  (full live feed)
//   - Match detail:      /live-ultra/match/:id
//   - Master data:       /data/*.json (EUROPE, ASIA, AFRICA, etc.)
// ============================================================

const APP_VERSION = "AI MatchLab ULTRA v1.0.0";
const AUTO_REFRESH_DEFAULT_SEC = 60;
const WORKER_BASE_URL = "https://aimatchlab-main.pierros1402.workers.dev";
const LIVE_ENDPOINT = `${WORKER_BASE_URL}/live-ultra`;
const MATCH_DETAIL_ENDPOINT = `${WORKER_BASE_URL}/live-ultra/match/`;

// ------------------------------------------------------------
// GLOBAL STATE
// ------------------------------------------------------------

let autoRefreshTimer = null;
let deferredInstallPrompt = null;
let swRegistration = null;

// Master (continents / countries / leagues)
let MASTER = null;

// Live cache από worker
let LIVE_CACHE = {
  timestamp: null,
  matches: [],
};

// Τρέχουσα επιλογή UI
let CURRENT_SELECTION = {
  continentCode: "",
  countryCode: "",
  countryName: "",
  leagueId: "",
  leagueName: "",
  tab: "live",
};

// ------------------------------------------------------------
// DOM HELPERS
// ------------------------------------------------------------

function $(id) {
  return document.getElementById(id);
}

// ------------------------------------------------------------
// THEME
// ------------------------------------------------------------

function setTheme(theme) {
  const root = document.documentElement;
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", prefersDark ? "dark" : "light");
  } else {
    root.setAttribute("data-theme", theme);
  }
  localStorage.setItem("aiml_theme", theme);
}

function loadInitialTheme() {
  const saved = localStorage.getItem("aiml_theme") || "dark";
  setTheme(saved);
  const radios = document.querySelectorAll('input[name="themeChoice"]');
  radios.forEach((r) => {
    r.checked = r.value === saved;
  });
}

// ------------------------------------------------------------
// VERSION + TIMESTAMP
// ------------------------------------------------------------

function updateVersionLabels() {
  const versionElems = [$("appVersion"), $("footerVersion")];
  versionElems.forEach((el) => {
    if (el) el.textContent = APP_VERSION;
  });
  const yearEl = $("footerYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

function setLastUpdateTimestamp(fromServerIso) {
  const label = $("lastUpdateLabel");
  if (!label) return;

  if (fromServerIso) {
    const d = new Date(fromServerIso);
    label.textContent = `Last update: ${d.toLocaleTimeString()}`;
  } else {
    const now = new Date();
    label.textContent = `Last update: ${now.toLocaleTimeString()}`;
  }
}

// ------------------------------------------------------------
// TABS
// ------------------------------------------------------------

function setupTabs() {
  const tabs = document.querySelectorAll(".ml-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("ml-tab-active"));
      tab.classList.add("ml-tab-active");
      const tabKey = tab.dataset.tab;
      CURRENT_SELECTION.tab = tabKey;
      localStorage.setItem("aiml_active_tab", tabKey);

      const title = $("mainPanelTitle");
      if (title) {
        if (tabKey === "live") title.textContent = "Live Matches";
        else if (tabKey === "upcoming") title.textContent = "Upcoming Matches";
        else if (tabKey === "recent") title.textContent = "Recent Results";
        else if (tabKey === "smartmoney") title.textContent = "SmartMoney Overlay";
        else if (tabKey === "matrix") title.textContent = "GoalMatrix Engine";
      }

      // Re-render με βάση το current state
      renderCurrentMainPanel();
    });
  });

  const savedTab = localStorage.getItem("aiml_active_tab");
  if (savedTab) {
    const tab = document.querySelector(`.ml-tab[data-tab="${savedTab}"]`);
    if (tab) {
      tab.click();
      return;
    }
  }

  const first = document.querySelector(".ml-tab");
  if (first) first.click();
}

// ------------------------------------------------------------
// AUTO REFRESH
// ------------------------------------------------------------

function startAutoRefresh() {
  const toggle = $("autoRefreshToggle");
  const status = $("autoRefreshStatus");
  const intervalInput = $("autoRefreshInterval");

  if (!toggle || !intervalInput) return;

  const enabled = toggle.checked;
  const seconds = Math.max(
    15,
    parseInt(intervalInput.value || AUTO_REFRESH_DEFAULT_SEC, 10)
  );

  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }

  if (enabled) {
    autoRefreshTimer = setInterval(() => refreshData(false), seconds * 1000);
    status?.classList.remove("ml-hidden");
  } else {
    status?.classList.add("ml-hidden");
  }

  localStorage.setItem(
    "aiml_auto_refresh",
    JSON.stringify({ enabled, seconds })
  );
}

function loadAutoRefreshSettings() {
  const raw = localStorage.getItem("aiml_auto_refresh");
  const toggle = $("autoRefreshToggle");
  const intervalInput = $("autoRefreshInterval");
  if (!toggle || !intervalInput) return;

  if (raw) {
    try {
      const obj = JSON.parse(raw);
      toggle.checked = obj.enabled;
      intervalInput.value = obj.seconds;
    } catch {
      toggle.checked = true;
      intervalInput.value = AUTO_REFRESH_DEFAULT_SEC;
    }
  } else {
    toggle.checked = true;
    intervalInput.value = AUTO_REFRESH_DEFAULT_SEC;
  }

  startAutoRefresh();
}

// ------------------------------------------------------------
// MODALS
// ------------------------------------------------------------

function openModal(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("ml-hidden");
}

function closeModal(id) {
  const el = $(id);
  if (!el) return;
  el.classList.add("ml-hidden");
}

// ------------------------------------------------------------
// INSTALL PROMPT
// ------------------------------------------------------------

function setupInstallPrompt() {
  const installBtn = $("installBtn");
  if (!installBtn) return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installBtn.classList.remove("ml-hidden");
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    installBtn.disabled = true;
    await deferredInstallPrompt.prompt();
    try {
      await deferredInstallPrompt.userChoice;
    } catch {}
    deferredInstallPrompt = null;
    installBtn.classList.add("ml-hidden");
    installBtn.disabled = false;
  });
}

// ------------------------------------------------------------
// SERVICE WORKER + UPDATE BAR
// ------------------------------------------------------------

function showUpdateBar() {
  const bar = $("updateBar");
  if (bar) bar.classList.remove("ml-hidden");
}

function hideUpdateBar() {
  const bar = $("updateBar");
  if (bar) bar.classList.add("ml-hidden");
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/service-worker.js");
      swRegistration = reg;
      console.log("[AI MatchLab] SW registered", reg.scope);

      if (reg.waiting) {
        showUpdateBar();
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showUpdateBar();
          }
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    } catch (err) {
      console.warn("[AI MatchLab] SW register error", err);
    }
  });
}

function setupUpdateBarActions() {
  const updateNowBtn = $("updateNowBtn");
  const updateLaterBtn = $("updateLaterBtn");

  updateLaterBtn?.addEventListener("click", () => hideUpdateBar());

  updateNowBtn?.addEventListener("click", () => {
    if (!swRegistration || !swRegistration.waiting) {
      window.location.reload();
      return;
    }
    swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
  });
}

// ============================================================
// MASTER FILE (continents / countries / leagues)
// ============================================================

// Διαβάζει πολλά JSON objects κολλημένα (όπως είναι το δικό σου αρχείο)
// και τα κάνει ένα array από JS objects.
function parseConcatenatedJsonObjects(text) {
  const objects = [];
  let depth = 0;
  let inString = false;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    // toggle string state (προσοχή στα escaped quotes)
    if (ch === '"' && text[i - 1] !== "\\") {
      inString = !inString;
    }
    if (inString) continue;

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        const slice = text.slice(start, i + 1);
        try {
          objects.push(JSON.parse(slice));
        } catch (e) {
          console.warn("[AI MatchLab] Failed to parse sub-object:", e);
        }
        start = -1;
      }
    }
  }

  return objects;
}

// Παίρνει οποιαδήποτε «ακατέργαστη» μορφή (letter blocks, parts κλπ)
// και τη μετατρέπει σε MASTER.continents → countries → leagues
function normalizeMasterStructure(raw) {
  // Αν είναι ήδη στη μορφή που θέλουμε, δεν πειράζουμε τίποτα.
  if (raw && Array.isArray(raw.continents)) {
    return raw;
  }

  let records = [];

  // 1) Αν είναι κατευθείαν array από λίγκες
  if (Array.isArray(raw)) {
    records = raw;
  }
  // 2) Αν είναι object με arrays μέσα (όπως το δικό σου: A, B_part1 κλπ)
  else if (raw && typeof raw === "object") {
    Object.values(raw).forEach((val) => {
      if (Array.isArray(val)) {
        records.push(...val);
      } else if (val && typeof val === "object") {
        Object.values(val).forEach((inner) => {
          if (Array.isArray(inner)) records.push(...inner);
        });
      }
    });
  }

  if (!records.length) {
    return { continents: [] };
  }

  const confedToCont = {
    UEFA: "Europe",
    CONMEBOL: "South America",
    CONCACAF: "North America",
    CAF: "Africa",
    AFC: "Asia",
    OFC: "Oceania",
  };

  const contCode = {
    Europe: "EU",
    Asia: "AS",
    Africa: "AF",
    "North America": "NA",
    "South America": "SA",
    Oceania: "OC",
    International: "INT",
    World: "INT",
  };

  const continentsMap = new Map();

  for (const rec of records) {
    if (!rec) continue;

    const rawCont = rec.continent || "International";
    const contName = confedToCont[rawCont] || rawCont;
    const code =
      contCode[contName] || contName.slice(0, 2).toUpperCase();

    if (!continentsMap.has(contName)) {
      continentsMap.set(contName, {
        continent_code: code,
        continent_name: contName,
        countries: new Map(),
      });
    }
    const cont = continentsMap.get(contName);

    const countryName = rec.country || "International";
    const countryCode =
      rec.country_code || countryName.slice(0, 3).toUpperCase();

    if (!cont.countries.has(countryName)) {
      cont.countries.set(countryName, {
        country_code: countryCode,
        country_name: countryName,
        timezone: null,
        region_cluster: null,
        leagues: [],
      });
    }
    const country = cont.countries.get(countryName);

    country.leagues.push({
      league_id: rec.code,
      display_name: rec.name,
      tier: rec.tier ?? null,
      type: rec.type ?? null,
      sub_type: rec.sub_type ?? null,
      active: rec.active ?? true,
    });
  }

  const continentOrder = [
    "Europe",
    "South America",
    "North America",
    "Asia",
    "Africa",
    "Oceania",
    "International",
  ];

  const continents = [];

  // πρώτα οι βασικές ήπειροι με συγκεκριμένη σειρά
  for (const name of continentOrder) {
    if (!continentsMap.has(name)) continue;
    const cont = continentsMap.get(name);
    continents.push({
      continent_code: cont.continent_code,
      continent_name: cont.continent_name,
      countries: Array.from(cont.countries.values()),
    });
  }

  // και μετά τυχόν «έξτρα» κατηγορίες, αν υπάρχουν
  for (const [name, cont] of continentsMap.entries()) {
    if (continentOrder.includes(name)) continue;
    continents.push({
      continent_code: cont.continent_code,
      continent_name: cont.continent_name,
      countries: Array.from(cont.countries.values()),
    });
  }

  return { continents };
}

async function loadMasterFile() {
  // NEW MULTI-FILE MASTER LOADER
  // Διαβάζει ξεχωριστά JSON αρχεία ανά ήπειρο από τον φάκελο /data
  // και χτίζει το MASTER = { continents: [...] } που χρησιμοποιεί όλο το UI.
  const CONTINENT_SOURCES = [
    { code: "EU",  name: "Europe",         file: "/data/EUROPE.json" },
    { code: "SA",  name: "South America",  file: "/data/SOUTH_AMERICA.json" },
    { code: "NA",  name: "North America",  file: "/data/NORTH_AMERICA.json" },
    { code: "AS",  name: "Asia",           file: "/data/ASIA.json" },
    { code: "AF",  name: "Africa",         file: "/data/AFRICA.json" },
    { code: "OC",  name: "Oceania",        file: "/data/OCEANIA.json" },
    { code: "INT", name: "International",  file: "/data/INTERNATIONAL.json" }
  ];

  const continents = [];

  for (const src of CONTINENT_SOURCES) {
    try {
      const res = await fetch(src.file + `?v=${APP_VERSION}`, { cache: "no-store" });
      if (!res.ok) {
        console.warn("[AI MatchLab] Cannot load continent file:", src.file, res.status);
        continue;
      }

      const data = await res.json();

      // Περίπτωση 1: απλό αντικείμενο { continent_code, continent_name, countries: [...] }
      if (data && data.continent_code && Array.isArray(data.countries)) {
        continents.push({
          continent_code: data.continent_code,
          continent_name: data.continent_name || src.name,
          countries: data.countries
        });
      }
      // Περίπτωση 2: object με { continents: [...] } (fallback για μελλοντική χρήση)
      else if (data && Array.isArray(data.continents)) {
        data.continents.forEach((c) => {
          if (c && c.continent_code && Array.isArray(c.countries)) {
            continents.push(c);
          }
        });
      } else {
        console.warn("[AI MatchLab] Unexpected structure in", src.file, data);
      }
    } catch (err) {
      console.warn("[AI MatchLab] Error loading continent file:", src.file, err);
    }
  }

  if (!continents.length) {
    console.error("[AI MatchLab] No continent data loaded.");
    return;
  }

  MASTER = { continents };
  console.log("[AI MatchLab] MASTER READY (multi-file)", MASTER);
  loadContinents();
}

function loadContinents() {
  const sel = $("continentSelect");
  if (!sel || !MASTER || !MASTER.continents) return;

  sel.innerHTML = `<option value="">Europe</option>`;

  MASTER.continents.forEach((c) => {
    sel.innerHTML += `<option value="${c.continent_code}">${c.continent_name}</option>`;
  });

  sel.onchange = () => {
    const contCode = sel.value || "";
    CURRENT_SELECTION.continentCode = contCode;
    CURRENT_SELECTION.countryCode = "";
    CURRENT_SELECTION.countryName = "";
    CURRENT_SELECTION.leagueId = "";
    CURRENT_SELECTION.leagueName = "";

    loadCountries(contCode);
    clearRightPanels();
    renderCurrentMainPanel();
  };

  // default: Europe αν υπάρχει
  const europe = MASTER.continents.find((c) => c.continent_code === "EU");
  if (europe) {
    sel.value = "EU";
    CURRENT_SELECTION.continentCode = "EU";
    loadCountries("EU");
    renderCurrentMainPanel();
  }
}

function loadCountries(contCode) {
  const sel = $("countrySelect");
  if (!sel) return;

  sel.innerHTML = `<option value="">All Countries</option>`;

  if (!MASTER || !contCode) {
    renderCurrentMainPanel();
    return;
  }

  const cont = MASTER.continents.find((c) => c.continent_code === contCode);
  if (!cont) {
    renderCurrentMainPanel();
    return;
  }

  cont.countries.forEach((country) => {
    sel.innerHTML += `<option value="${country.country_code}">${country.country_name}</option>`;
  });

  sel.onchange = () => {
    const code = sel.value || "";
    CURRENT_SELECTION.countryCode = code;

    const contObj = MASTER.continents.find((c) => c.continent_code === contCode);
    const countryObj =
      contObj && contObj.countries.find((c) => c.country_code === code);

    CURRENT_SELECTION.countryName = countryObj ? countryObj.country_name : "";

    loadLeagues(code, contCode);
    clearRightPanels();
    renderCurrentMainPanel();
  };

  // αρχικό render χωρών για την ήπειρο
  renderCountryCardsForContinent(contCode);
}

function loadLeagues(countryCode, contCode) {
  const sel = $("leagueSelect");
  if (!sel) return;

  sel.innerHTML = `<option value="">All Leagues</option>`;

  if (!MASTER || !contCode || !countryCode) {
    renderCurrentMainPanel();
    return;
  }

  const cont = MASTER.continents.find((c) => c.continent_code === contCode);
  if (!cont) {
    renderCurrentMainPanel();
    return;
  }

  const country = cont.countries.find((c) => c.country_code === countryCode);
  if (!country) {
    renderCurrentMainPanel();
    return;
  }

  country.leagues.forEach((league) => {
    const name = league.display_name || league.name;
    sel.innerHTML += `<option value="${league.league_id}">${name}</option>`;
  });

  sel.onchange = () => {
    const leagueId = sel.value || "";
    const league = country.leagues.find((l) => l.league_id === leagueId);
    CURRENT_SELECTION.leagueId = leagueId;
    CURRENT_SELECTION.leagueName = league ? (league.display_name || league.name) : "";
    clearRightPanels();
    renderCurrentMainPanel();
  };

  // αρχικό UI: εμφάνιση καρτών λιγκών
  renderLeagueCardsForCountry(contCode, countryCode);
}

// ============================================================
// LIVE ENGINE – FETCH FROM WORKER
// ============================================================

async function refreshData(manual = false) {
  try {
    const res = await fetch(LIVE_ENDPOINT, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.error || "live_ultra_error");
    }

    LIVE_CACHE.timestamp = data.timestamp || null;
    LIVE_CACHE.matches = Array.isArray(data.matches) ? data.matches : [];

    setLastUpdateTimestamp(data.timestamp);
    if (manual) {
      console.log("[AI MatchLab] Manual refresh OK");
    }

    // Re-render με βάση τις τρέχουσες επιλογές (continent/country/league)
    renderCurrentMainPanel();
  } catch (err) {
    console.warn("[AI MatchLab] refreshData error:", err);
    setLastUpdateTimestamp(); // local time
  }
}

// ============================================================
// RENDER HELPERS – PREMIUM CARDS
// ============================================================

function clearRightPanels() {
  const stand = $("standingsContainer");
  const ins = $("insightsContainer");
  if (stand) {
    stand.innerHTML = `
      <div class="ml-placeholder small">
        <p>Βαθμολογία league.</p>
      </div>
    `;
  }
  if (ins) {
    ins.innerHTML = `
      <div class="ml-placeholder small">
        <p>SmartMoney, xG, trends κλπ.</p>
      </div>
    `;
  }
}

function renderCurrentMainPanel() {
  const container = $("matchesContainer");
  if (!container) return;

  // Αν δεν υπάρχει continent → γενικό placeholder
  if (!CURRENT_SELECTION.continentCode || !MASTER) {
    container.innerHTML = `
      <div class="ml-placeholder">
        <p>Επίλεξε Ήπειρο, Χώρα και Λίγκα για να δεις αγώνες.</p>
      </div>
    `;
    return;
  }

  // Αν δεν υπάρχει country → δείχνουμε χώρες
  if (!CURRENT_SELECTION.countryCode) {
    renderCountryCardsForContinent(CURRENT_SELECTION.continentCode);
    return;
  }

  // Αν δεν υπάρχει league → δείχνουμε λίγκες
  if (!CURRENT_SELECTION.leagueId) {
    renderLeagueCardsForCountry(
      CURRENT_SELECTION.continentCode,
      CURRENT_SELECTION.countryCode
    );
    return;
  }

  // Αλλιώς δείχνουμε αγώνες της λίγκας
  renderMatchesForCurrentLeague();
}

function renderCountryCardsForContinent(contCode) {
  const container = $("matchesContainer");
  if (!container || !MASTER) return;

  const cont = MASTER.continents.find((c) => c.continent_code === contCode);
  if (!cont) return;

  container.innerHTML = "";
  cont.countries.forEach((country) => {
    const card = document.createElement("div");
    card.className = "ml-list-item ml-card-country";
    card.innerHTML = `
      <div class="ml-list-title">${country.country_name}</div>
      <div class="ml-list-sub">Leagues: ${country.leagues.length}</div>
    `;
    card.onclick = () => {
      CURRENT_SELECTION.countryCode = country.country_code;
      CURRENT_SELECTION.countryName = country.country_name;
      $("countrySelect").value = country.country_code;
      loadLeagues(country.country_code, contCode);
      clearRightPanels();
      renderCurrentMainPanel();
    };
    container.appendChild(card);
  });
}

function renderLeagueCardsForCountry(contCode, countryCode) {
  const container = $("matchesContainer");
  if (!container || !MASTER) return;

  const cont = MASTER.continents.find((c) => c.continent_code === contCode);
  if (!cont) return;
  const country = cont.countries.find((c) => c.country_code === countryCode);
  if (!country) return;

  container.innerHTML = "";
  country.leagues.forEach((league) => {
    const name = league.display_name || league.name;
    const card = document.createElement("div");
    card.className = "ml-list-item ml-card-league";
    card.innerHTML = `
      <div class="ml-list-title">${name}</div>
      <div class="ml-list-sub">${country.country_name}</div>
    `;
    card.onclick = () => {
      CURRENT_SELECTION.leagueId = league.league_id;
      CURRENT_SELECTION.leagueName = name;
      $("leagueSelect").value = league.league_id;
      clearRightPanels();
      renderMatchesForCurrentLeague();
    };
    container.appendChild(card);
  });
}

function findMatchesForSelection() {
  if (!LIVE_CACHE.matches || !CURRENT_SELECTION.leagueName) return [];

  const targetLeagueName = CURRENT_SELECTION.leagueName.toLowerCase().trim();
  const targetCountryName = (CURRENT_SELECTION.countryName || "").toLowerCase();

  return LIVE_CACHE.matches.filter((m) => {
    const l = m.league || {};
    const leagueName = (l.name || "").toLowerCase();
    const leagueCountry = (l.country || "").toLowerCase();

    const nameMatch = leagueName.includes(targetLeagueName);
    const countryMatch =
      !targetCountryName || leagueCountry.includes(targetCountryName);

    return nameMatch && countryMatch;
  });
}

function renderMatchesForCurrentLeague() {
  const container = $("matchesContainer");
  if (!container) return;

  const matches = findMatchesForSelection();

  if (!matches || matches.length === 0) {
    container.innerHTML = `
      <div class="ml-placeholder">
        <p>Δεν βρέθηκαν live αγώνες για τη λίγκα <strong>${
          CURRENT_SELECTION.leagueName || ""
        }</strong>.<br/>Μόλις εμφανιστούν, θα τους δεις εδώ.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  matches.forEach((match) => {
    const home = match.teams?.home?.name || "Home";
    const away = match.teams?.away?.name || "Away";
    const status = match.status?.code || "";
    const minute = match.status?.minute;
    const liveHome = match.score?.live?.home ?? "";
    const liveAway = match.score?.live?.away ?? "";

    const minuteLabel =
      minute != null ? `${minute}'` : status ? status : "";

    const card = document.createElement("div");
    card.className = "ml-list-item ml-card-match";
    card.innerHTML = `
      <div class="ml-match-row">
        <div class="ml-match-teams">
          <div class="ml-team-line">
            <span class="ml-team-name">${home}</span>
            <span class="ml-team-score">${liveHome === null ? "" : liveHome}</span>
          </div>
          <div class="ml-team-line">
            <span class="ml-team-name">${away}</span>
            <span class="ml-team-score">${liveAway === null ? "" : liveAway}</span>
          </div>
        </div>
        <div class="ml-match-meta">
          <span class="ml-match-minute">${minuteLabel}</span>
          <span class="ml-match-source">${match.source || ""}</span>
        </div>
      </div>
    `;

    card.onclick = () => {
      loadMatchDetail(match.match_id);
    };

    container.appendChild(card);
  });
}

// ============================================================
// MATCH DETAIL (worker: /live-ultra/match/:id)
// ============================================================

async function loadMatchDetail(matchId) {
  try {
    const res = await fetch(MATCH_DETAIL_ENDPOINT + encodeURIComponent(matchId), {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "match_detail_error");

    renderMatchDetailPanel(data);
    renderStatsPanel(data.stats);
    renderTimelinePanel(data.timeline);
  } catch (err) {
    console.warn("[AI MatchLab] match detail error:", err);
  }
}

function renderMatchDetailPanel(detailPayload) {
  const panel = $("insightsContainer");
  if (!panel) return;

  const match = detailPayload.basic || {};
  const home = match.teams?.home?.name || "Home";
  const away = match.teams?.away?.name || "Away";
  const scoreHome = match.score?.live?.home ?? match.score?.fulltime?.home ?? "";
  const scoreAway = match.score?.live?.away ?? match.score?.fulltime?.away ?? "";
  const leagueName = match.league?.name || "";
  const status = match.status?.description || match.status?.code || "";
  const minute = match.status?.minute;

  panel.innerHTML = `
    <div class="ml-detail-box">
      <h3>${home} vs ${away}</h3>
      <p class="ml-detail-league">${leagueName}</p>
      <p class="ml-detail-score">${scoreHome} - ${scoreAway}</p>
      <p class="ml-detail-status">${minute != null ? minute + "'" : ""} ${status}</p>
      <p class="ml-detail-meta">Match ID: ${detailPayload.match_id}</p>
    </div>
  `;
}

function renderStatsPanel(stats) {
  const panel = $("standingsContainer");
  if (!panel) return;

  if (!stats) {
    panel.innerHTML = `
      <div class="ml-placeholder small">
        <p>Δεν υπάρχουν διαθέσιμα στατιστικά για αυτόν τον αγώνα.</p>
      </div>
    `;
    return;
  }

  const possH = stats.possession?.home;
  const possA = stats.possession?.away;

  panel.innerHTML = `
    <div class="ml-detail-box">
      <h3>Match Stats</h3>
      <div class="ml-stat-row">
        <span>Possession</span>
        <span>${possH ?? "-"}% : ${possA ?? "-"}%</span>
      </div>
      <div class="ml-stat-row">
        <span>Shots (Total)</span>
        <span>${stats.shots?.home?.total ?? 0} : ${stats.shots?.away?.total ?? 0}</span>
      </div>
      <div class="ml-stat-row">
        <span>Shots On</span>
        <span>${stats.shots?.home?.on ?? 0} : ${stats.shots?.away?.on ?? 0}</span>
      </div>
      <div class="ml-stat-row">
        <span>Corners</span>
        <span>${stats.corners?.home ?? 0} : ${stats.corners?.away ?? 0}</span>
      </div>
      <div class="ml-stat-row">
        <span>Yellow Cards</span>
        <span>${stats.cards?.yellow?.home ?? 0} : ${stats.cards?.yellow?.away ?? 0}</span>
      </div>
      <div class="ml-stat-row">
        <span>Red Cards</span>
        <span>${stats.cards?.red?.home ?? 0} : ${stats.cards?.red?.away ?? 0}</span>
      </div>
    </div>
  `;
}

function renderTimelinePanel(timeline) {
  const panel = $("insightsContainer");
  if (!panel) return;
  if (!timeline || !Array.isArray(timeline) || timeline.length === 0) {
    // αν δεν έχει timeline, κρατάμε το detail panel όπως είναι (μην το σβήσουμε)
    return;
  }

  const items = timeline
    .map((ev) => {
      const minute = ev.minute != null ? `${ev.minute}'` : "";
      const player = ev.player || "";
      const type = ev.type || "";
      const team =
        ev.team === "home"
          ? "H"
          : ev.team === "away"
          ? "A"
          : "";
      return `<div class="ml-timeline-row">
        <span class="ml-timeline-minute">${minute}</span>
        <span class="ml-timeline-team">${team}</span>
        <span class="ml-timeline-type">${type}</span>
        <span class="ml-timeline-player">${player}</span>
      </div>`;
    })
    .join("");

  panel.innerHTML += `
    <div class="ml-detail-box ml-timeline-box">
      <h4>Timeline</h4>
      <div class="ml-timeline-list">
        ${items}
      </div>
    </div>
  `;
}

// ============================================================
// INIT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  updateVersionLabels();
  loadInitialTheme();
  setupTabs();
  setupInstallPrompt();
  setupUpdateBarActions();

  // Settings / auto-refresh
  loadAutoRefreshSettings();

  // Header buttons
  $("refreshBtn")?.addEventListener("click", () => refreshData(true));

  $("themeToggleBtn")?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
    const radios = document.querySelectorAll('input[name="themeChoice"]');
    radios.forEach((r) => {
      r.checked = r.value === next;
    });
  });

  $("settingsBtn")?.addEventListener("click", () => openModal("settingsModal"));
  $("legalBtn")?.addEventListener("click", () => openModal("legalModal"));
  $("footerLegalBtn")?.addEventListener("click", () => openModal("legalModal"));

  document
    .querySelectorAll("[data-close-modal]")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        closeModal(btn.getAttribute("data-close-modal"))
      )
    );

  $("saveSettingsBtn")?.addEventListener("click", () => {
    const radios = document.querySelectorAll('input[name="themeChoice"]');
    let theme = "dark";
    radios.forEach((r) => {
      if (r.checked) theme = r.value;
    });
    setTheme(theme);
    startAutoRefresh();
    closeModal("settingsModal");
  });

  $("autoRefreshToggle")?.addEventListener("change", startAutoRefresh);
  $("autoRefreshInterval")?.addEventListener("change", startAutoRefresh);

  // Φορτώνουμε master + πρώτο live pull
  loadMasterFile();
  refreshData(false);
});

registerServiceWorker();
