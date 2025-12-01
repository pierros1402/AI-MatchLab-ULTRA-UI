/* ============================================================
   FINAL RENDER ENGINE — DICTIONARY JSON + ACCORDION UI
   WITH AUTO-FALLBACK CLEAN NAMES
============================================================ */

const DATA_ROOT = "/AI-MATCHLAB-DATA/indexes";

/* Load JSON safely */
async function loadJSON(path) {
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error("Network error");
        return await res.json();
    } catch (err) {
        console.error("JSON load error:", err);
        return null;
    }
}

/* Convert dictionary → array */
function dictToArray(dict) {
    return Object.entries(dict || {}).map(([code, data]) => ({
        ...data,
        code,
    }));
}

/* ---------------- HELPERS ---------------- */

function openPanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    document.querySelectorAll("#left-panel .accordion-body").forEach(b => {
        if (b !== panel) b.style.display = "none";
    });

    panel.style.display = "block";
}

/* CLEAN NAME HELPERS */

function cleanLeagueName(code) {
    // ALB1 → ALB 1
    // AZE_CUP → AZE CUP
    return code.replace(/_/g, " ").replace(/([A-Za-z]+)(\d+)/, "$1 $2");
}

function cleanTeamName(code) {
    // ALB1_PARTIZANI → PARTIZANI
    const parts = code.split("_");
    return parts.slice(1).join(" ").trim();
}

/* ---------------- CONTINENTS ---------------- */

export function renderContinents(list) {
    const el = document.getElementById("panel-continents");
    if (!el) return;

    el.innerHTML = list
        .map(c => `<div class="item continent" data-continent="${c.code}">${c.name}</div>`)
        .join("");

    document.querySelectorAll(".continent").forEach(btn => {
        btn.onclick = () => {
            renderCountries(btn.dataset.continent);
        };
    });

    console.log("[Render] Continents loaded");
    openPanel("panel-continents");
}

/* ---------------- COUNTRIES ---------------- */

export async function renderCountries(continent) {
    const root = document.getElementById("panel-countries");
    root.innerHTML = "Loading...";

    const file = await loadJSON(`${DATA_ROOT}/countries_index.json`);
    if (!file) {
        root.innerHTML = "No data found";
        return;
    }

    const all = dictToArray(file.countries);
    const list = all.filter(c => c.continent === continent);

    root.innerHTML = list.length
        ? list.map(c => `<div class="item country" data-cc="${c.code}">${c.name || c.code}</div>`).join("")
        : "No countries";

    document.querySelectorAll(".country").forEach(btn => {
        btn.onclick = () => {
            renderLeagues(btn.dataset.cc);
        };
    });

    console.log("[Render] Countries:", list.length);
    openPanel("panel-countries");
}

/* ---------------- LEAGUES ---------------- */

export async function renderLeagues(cc) {
    const root = document.getElementById("panel-leagues");
    root.innerHTML = "Loading...";

    const file = await loadJSON(`${DATA_ROOT}/leagues_index.json`);
    if (!file) {
        root.innerHTML = "No data found";
        return;
    }

    const all = dictToArray(file.leagues);
    const list = all.filter(l => l.country === cc || l.country_code === cc);

    root.innerHTML = list.length
        ? list.map(l => {
            let name = l.name || l.display_name;
            if (!name) name = cleanLeagueName(l.code);
            return `<div class="item league" data-lid="${l.code}">${name}</div>`;
        }).join("")
        : "No leagues";

    document.querySelectorAll(".league").forEach(btn => {
        btn.onclick = () => {
            renderTeams(btn.dataset.lid);
        };
    });

    console.log("[Render] Leagues:", list.length);
    openPanel("panel-leagues");
}

/* ---------------- TEAMS ---------------- */

export async function renderTeams(leagueId) {
    const root = document.getElementById("panel-teams");
    root.innerHTML = "Loading...";

    const file = await loadJSON(`${DATA_ROOT}/teams_global_index.json`);
    if (!file) {
        root.innerHTML = "No data found";
        return;
    }

    const all = dictToArray(file.teams);
    const list = all.filter(t => t.league === leagueId || t.league_id === leagueId);

    root.innerHTML = list.length
        ? list.map(t => {
            let name = t.name || t.team_name;
            if (!name) name = cleanTeamName(t.code);
            return `<div class="item team">${name}</div>`;
        }).join("")
        : "No teams";

    console.log("[Render] Teams:", list.length);
    openPanel("panel-teams");
}

/* ---------------- MATCHES (DEMO) ---------------- */

export function renderMatches(team) {
    const root = document.getElementById("panel-matches");
    root.innerHTML = `<div>No match data (demo). Team: ${team}</div>`;
    openPanel("panel-matches");
}

/* ---------------- DETAILS (DEMO) ---------------- */

export function renderDetails(id) {
    const root = document.getElementById("panel-details");
    root.innerHTML = `<div>Match details placeholder (ID: ${id})</div>`;
    openPanel("panel-details");
}
