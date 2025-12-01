// ======================================================================
// AI MATCHLAB ULTRA — LANGUAGE MODULE (FINAL)
// ======================================================================

export const LANG = {
    en: {
        continents: "Continents",
        countries: "Countries",
        leagues: "Leagues",
        matches: "Matches",
        details: "Match Details",
        teams: "Teams",
        goalmatrix: "GoalMatrix",
        smartmoney: "SmartMoney",
        radar: "Radar",
        live: "Live"
    },

    gr: {
        continents: "Ήπειροι",
        countries: "Χώρες",
        leagues: "Λίγκες",
        matches: "Αγώνες",
        details: "Λεπτομέρειες",
        teams: "Ομάδες",
        goalmatrix: "GoalMatrix",
        smartmoney: "SmartMoney",
        radar: "Radar",
        live: "Live"
    }
};

// ----------------------------------------------------------------------
// INIT
// ----------------------------------------------------------------------
export function initLanguage() {
    console.log("Language module ready");

    const saved = localStorage.getItem("AIML_LANG");
    if (saved) {
        window.AIML_LANG = saved;
    } else {
        window.AIML_LANG = "en";
    }

    applyLanguage();
}

// ----------------------------------------------------------------------
// APPLY
// ----------------------------------------------------------------------
export function applyLanguage() {
    const dict = LANG[window.AIML_LANG] || LANG.en;

    const mapping = [
        ["continents", dict.continents],
        ["countries", dict.countries],
        ["leagues", dict.leagues],
        ["matches", dict.matches],
        ["details", dict.details],
        ["teams", dict.teams],
        ["goalmatrix", dict.goalmatrix],
        ["smartmoney", dict.smartmoney],
        ["radar", dict.radar],
        ["live", dict.live]
    ];

    for (const [key, text] of mapping) {
        const el = document.querySelector(`[data-panel-btn='${key}']`);
        if (el) el.textContent = text;
    }
}

// ----------------------------------------------------------------------
// TOGGLE
// ----------------------------------------------------------------------
export function toggleLanguage() {
    window.AIML_LANG = window.AIML_LANG === "en" ? "gr" : "en";
    localStorage.setItem("AIML_LANG", window.AIML_LANG);
    applyLanguage();
}
