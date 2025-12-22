/* =========================================================
   League Binding v1.5 (AIML ULTRA, utils, global script)
   - Builds league index from per-continent FINAL datasets (same as accordion)
   - ESPN ⇄ Accordion matching (codes + common competition names)
   - Provides:
       LeagueBinding.init({preload:["EU"]})
       LeagueBinding.ingestContinentDataset(code, countriesArray)
       LeagueBinding.enrichMatch(match)
       LeagueBinding.activeLeagueIds(matches)
========================================================= */
(function () {
  "use strict";
  if (window.LeagueBinding && window.LeagueBinding.__v === "1.5") return;

  const DATA_BASE = "./AI-MATCHLAB-DATA";

  const CONTINENT_DATA = {
    EU: `${DATA_BASE}/europe/europe_betting_ready_FINAL.json`,
    AF: `${DATA_BASE}/africa/africa_betting_ready_FINAL.json`,
    AS: `${DATA_BASE}/asia/asia_betting_ready_FINAL.json`,
    NA: `${DATA_BASE}/north_america/north_america_betting_ready_FINAL.json`,
    SA: `${DATA_BASE}/south_america/south_america_betting_ready_FINAL.json`,
    OC: `${DATA_BASE}/oceania/oceania_betting_ready_FINAL.json`,
    IN: `${DATA_BASE}/international/international_betting_ready_FINAL.json`
  };

  // ESPN codes/slugs → canonical display names (as in your datasets)
  const ESPN_ALIAS = {
    "PL": "Premier League",
    "ENG.1": "Premier League",
    "EPL": "Premier League",
    "PD": "La Liga",
    "ESP.1": "La Liga",
    "LALIGA": "La Liga",
    "BL1": "Bundesliga",
    "GER.1": "Bundesliga",
    "SA": "Serie A",
    "ITA.1": "Serie A",
    "FL1": "Ligue 1",
    "FRA.1": "Ligue 1",
    "SL": "Super League Greece",
    "GRE.1": "Super League Greece"
  };

  const state = {
    ready: false,
    loading: null,
    // indices
    metaById: Object.create(null),      // leagueId -> meta
    idByName: Object.create(null),      // normName -> leagueId
    idByLoose: Object.create(null)      // looser norm -> leagueId
  };

  function esc(s) { return String(s == null ? "" : s); }

  function normKey(s) {
    return esc(s)
      .toLowerCase()
      .replace(/[’'`]/g, "")
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function looseKey(s) {
    return normKey(s)
      .replace(/\b(league|cup|division|group|stage|round|championship)\b/g, "")
      .replace(/\b(english|spain|spanish|german|italian|french|greek|portuguese|turkish)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function addLeague(meta) {
    if (!meta || !meta.id || !meta.name) return;
    const id = String(meta.id).trim();
    const name = String(meta.name).trim();

    state.metaById[id] = state.metaById[id] || meta;

    const nk = normKey(name);
    if (nk && !state.idByName[nk]) state.idByName[nk] = id;

    const lk = looseKey(name);
    if (lk && !state.idByLoose[lk]) state.idByLoose[lk] = id;
  }

  // Expected format (from your navigation.js): array of countries with leagues[]
  function ingestContinentDataset(continentCode, countriesArray) {
    if (!Array.isArray(countriesArray)) return;

    countriesArray.forEach((c) => {
      const countryName = c.country_name || "";
      const leagues = Array.isArray(c.leagues) ? c.leagues : [];
      leagues.forEach((l) => {
        const leagueId = l.league_id;
        const name = l.display_name || l.league_name || l.league_id;
        if (!leagueId || !name) return;

        addLeague({
          id: String(leagueId),
          name: String(name),
          continentCode: continentCode || "",
          countryName: String(countryName || ""),
          tier: (l.tier != null ? Number(l.tier) : null)
        });
      });
    });

    state.ready = true;
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }

  async function init(opts) {
    if (state.loading) return state.loading;

    const preload = Array.isArray(opts?.preload) ? opts.preload : ["EU"]; // default Europe only
    const codes = preload.filter((c) => CONTINENT_DATA[c]);

    // If already has data, no need to preload
    if (state.ready) return Promise.resolve(true);

    state.loading = (async () => {
      try {
        for (let i = 0; i < codes.length; i++) {
          const code = codes[i];
          const url = CONTINENT_DATA[code];
          const data = await fetchJson(url);
          ingestContinentDataset(code, Array.isArray(data) ? data : []);
        }
        state.ready = true;
        if (window.emit) window.emit("league-binding:ready", { preload: codes.slice() });
        return true;
      } catch (e) {
        console.warn("[LEAGUE-BIND] init failed:", e);
        return false;
      } finally {
        state.loading = null;
      }
    })();

    return state.loading;
  }

  function findLeagueIdByName(nameOrCode) {
    if (!nameOrCode) return null;

    const raw = String(nameOrCode).trim();
    const up = raw.toUpperCase();

    // 1) ESPN alias by code/slug
    const aliasName = ESPN_ALIAS[up] || null;
    if (aliasName) {
      const id1 = state.idByName[normKey(aliasName)] || state.idByLoose[looseKey(aliasName)] || null;
      if (id1) return id1;
    }

    // 2) direct exact name
    const id2 = state.idByName[normKey(raw)] || null;
    if (id2) return id2;

    // 3) loose match
    const id3 = state.idByLoose[looseKey(raw)] || null;
    if (id3) return id3;

    // 4) slug pattern like "eng.1"
    const m = raw.toLowerCase().match(/\b(eng|esp|ger|ita|fra|gre)\.1\b/);
    if (m) {
      const slug = (m[0] || "").toUpperCase();
      const alias2 = ESPN_ALIAS[slug];
      if (alias2) {
        const id4 = state.idByName[normKey(alias2)] || state.idByLoose[looseKey(alias2)] || null;
        if (id4) return id4;
      }
    }

    return null;
  }

  function enrichMatch(match) {
    if (!match || typeof match !== "object") return match;

    // Candidate fields from ESPN/live feeds
    const candidates = [
      match.leagueId,
      match.league_id,
      match.leagueSlug,
      match.leagueCode,
      match.leagueName,
      match.league,
      match.competition,
      match.tournament,
      match.league_name
    ].filter(Boolean);

    // Try resolve to canonical leagueId
    let leagueId = match.leagueId || null;
    if (!leagueId) {
      for (let i = 0; i < candidates.length; i++) {
        const id = findLeagueIdByName(candidates[i]);
        if (id) { leagueId = id; break; }
      }
    }

    if (leagueId && state.metaById[leagueId]) {
      const meta = state.metaById[leagueId];
      match.leagueId = leagueId;
      match.leagueName = meta.name;
      match.countryName = match.countryName || meta.countryName || "";
      match.continentCode = match.continentCode || meta.continentCode || "";
      if (meta.tier != null && isFinite(meta.tier) && match.tier == null) match.tier = meta.tier;
    } else {
      // At least normalize ESPN display name, even if id missing
      const up = String(match.leagueCode || match.leagueSlug || "").toUpperCase();
      const aliasName = ESPN_ALIAS[up];
      if (aliasName && !match.leagueName) match.leagueName = aliasName;
    }

    return match;
  }

  function activeLeagueIds(matches) {
    const set = Object.create(null);
    if (!Array.isArray(matches)) return [];
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      if (m && m.leagueId) set[String(m.leagueId)] = 1;
    }
    return Object.keys(set);
  }

  window.LeagueBinding = {
    __v: "1.5",
    init,
    ingestContinentDataset,
    enrichMatch,
    activeLeagueIds,
    _state: state
  };

})();
