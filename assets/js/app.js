// =====================================================================
// AI MATCHLAB ULTRA — FINAL CLEAN VERSION (NO SERVICE WORKER)
// Mobile-Install-Ready, Zero Caching, Zero SW Logic
// ALL UI & ENGINE LOGIC RETAINED
// =====================================================================

// ----------------------------------------------------------
// AUTO-CLEAN: Εξαφανίζει οποιονδήποτε ghost service-worker
// ----------------------------------------------------------
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
    });
}

// ----------------------------------------------------------
// ON LOAD
// ----------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    console.log("AI MatchLab ULTRA — CLEAN START");
    setFooterYear();
    initTheme();
    initInstallPrompt();
    initTabs();
    initRefreshButton();
    initAutoRefresh();
    loadContinents();   // MAIN ENTRY POINT
});

// ----------------------------------------------------------
// FOOTER YEAR
// ----------------------------------------------------------
function setFooterYear() {
    document.getElementById("footerYear").textContent = new Date().getFullYear();
}

// ----------------------------------------------------------
// THEME TOGGLE (dark/light)
// ----------------------------------------------------------
function initTheme() {
    const btn = document.getElementById("themeToggleBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
        const html = document.documentElement;
        const isDark = html.getAttribute("data-theme") === "dark";
        html.setAttribute("data-theme", isDark ? "light" : "dark");
    });
}

// ----------------------------------------------------------
// INSTALL PROMPT (mobile-only PWA installation)
// ----------------------------------------------------------
let deferredPrompt = null;

function initInstallPrompt() {
    document.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferredPrompt = e;

        const btn = document.getElementById("installBtn");
        if (btn) btn.classList.remove("ml-hidden");
    });

    const btnInstall = document.getElementById("installBtn");
    if (btnInstall) {
        btnInstall.addEventListener("click", async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            deferredPrompt = null;
            btnInstall.classList.add("ml-hidden");
        });
    }
}

// ----------------------------------------------------------
// TABS (Live / Upcoming / Recent / SmartMoney / Matrix)
// ----------------------------------------------------------
let activeTab = "live";

function initTabs() {
    const tabButtons = document.querySelectorAll(".ml-tab");
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            tabButtons.forEach(b => b.classList.remove("ml-tab-active"));
            btn.classList.add("ml-tab-active");
            activeTab = btn.dataset.tab;
            updateMainPanelTitle();
            fetchMatches();
        });
    });
}

function updateMainPanelTitle() {
    const titles = {
        live: "Live Matches",
        upcoming: "Upcoming Matches",
        recent: "Recent Matches",
        smartmoney: "SmartMoney Insights",
        matrix: "Goal Matrix"
    };
    document.getElementById("mainPanelTitle").textContent = titles[activeTab] || "Matches";
}

// ----------------------------------------------------------
// MANUAL REFRESH BUTTON
// ----------------------------------------------------------
function initRefreshButton() {
    const btn = document.getElementById("refreshBtn");
    btn.addEventListener("click", () => {
        fetchMatches();
    });
}

// ----------------------------------------------------------
// AUTO-REFRESH (every 30 seconds)
// ----------------------------------------------------------
function initAutoRefresh() {
    setInterval(() => {
        fetchMatches();
    }, 30000);
}

// ----------------------------------------------------------
// LOAD CONTINENTS
// ----------------------------------------------------------
async function loadContinents() {
    try {
        const res = await fetch("/data/continents.json");
        if (!res.ok) throw new Error("Continents file missing");
        const data = await res.json();

        populateContinents(data);
        fetchMatches();
    } catch (err) {
        console.error("MASTER LOAD ERROR (continents):", err);
    }
}

function populateContinents(list) {
    const sel = document.getElementById("continentSelect");
    sel.innerHTML = list.map(c =>
        `<option value="${c.continent_code}">${c.continent_name}</option>`
    ).join("");

    sel.addEventListener("change", () => {
        loadCountries(sel.value);
    });

    loadCountries(list[0].continent_code);
}

// ----------------------------------------------------------
// LOAD COUNTRIES
// ----------------------------------------------------------
async function loadCountries(code) {
    try {
        const url = `/data/${code}.json`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Continent data missing");
        const continentData = await res.json();

        const countries = continentData.countries || [];

        const sel = document.getElementById("countrySelect");
        sel.innerHTML = `<option value="ALL">All Countries</option>` +
            countries.map(c =>
                `<option value="${c.country_code}">${c.country_name}</option>`
            ).join("");

        sel.onchange = () => {
            loadLeagues(code, sel.value);
        };

        loadLeagues(code, "ALL");

    } catch (err) {
        console.error("COUNTRY LOAD ERROR:", err);
    }
}

// ----------------------------------------------------------
// LOAD LEAGUES
// ----------------------------------------------------------
async function loadLeagues(continentCode, countryCode) {
    try {
        const url = `/data/${continentCode}.json`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Leagues load error");

        const continentData = await res.json();
        const allCountries = continentData.countries || [];

        let leagues = [];

        if (countryCode === "ALL") {
            allCountries.forEach(c => {
                if (c.leagues) leagues.push(...c.leagues);
            });
        } else {
            const country = allCountries.find(c => c.country_code === countryCode);
            if (country && country.leagues) leagues = country.leagues;
        }

        const sel = document.getElementById("leagueSelect");
        sel.innerHTML = `<option value="ALL">All Leagues</option>` +
            leagues.map(l =>
                `<option value="${l.league_id}">${l.display_name}</option>`
            ).join("");

        sel.onchange = () => {
            fetchMatches();
        };

        fetchMatches();

    } catch (err) {
        console.error("LEAGUE LOAD ERROR:", err);
    }
}

// ----------------------------------------------------------
// FETCH MATCHES (Live / Upcoming / Recent)
// ----------------------------------------------------------
async function fetchMatches() {
    try {
        const continent = document.getElementById("continentSelect").value;
        const country = document.getElementById("countrySelect").value;
        const league = document.getElementById("leagueSelect").value;

        const url =
            `/live-api?tab=${activeTab}` +
            `&continent=${continent}` +
            `&country=${country}` +
            `&league=${league}`;

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("Match fetch failed");

        const data = await res.json();
        renderMatches(data);

        document.getElementById("lastUpdateLabel").textContent =
            "Last update: " + new Date().toLocaleTimeString();

    } catch (err) {
        console.error("MATCH FETCH ERROR:", err);
    }
}

// ----------------------------------------------------------
// RENDER MATCHES
// ----------------------------------------------------------
function renderMatches(list) {
    const box = document.getElementById("matchesContainer");

    if (!list || list.length === 0) {
        box.innerHTML = `
            <div class="ml-placeholder">
                <p>No matches found.</p>
            </div>`;
        return;
    }

    box.innerHTML = list.map(m => `
        <div class="ml-match-row">
            <div class="ml-match-time">${m.time || "-"}</div>
            <div class="ml-match-teams">
                <span>${m.home}</span>
                <span class="ml-vs">vs</span>
                <span>${m.away}</span>
            </div>
            <div class="ml-match-score">${m.score || "-"}</div>
        </div>
    `).join("");
}

// ----------------------------------------------------------
// END
// ----------------------------------------------------------
