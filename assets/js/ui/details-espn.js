/* assets/js/ui/details-espn.js */
/* v1.0.0 — ESPN Data Adapter (standings / teams+logos / news / fixtures / results + value stats) */
/* Global scripts, requires window.on/window.emit from app.js */

(function () {
  "use strict";

  // -----------------------------
  // Guards
  // -----------------------------
  const hasBus = typeof window.on === "function" && typeof window.emit === "function";
  if (!hasBus) return;

  // -----------------------------
  // Config
  // -----------------------------
  const VERSION = "1.0.0";
  const DEFAULT_NEWS_LIMIT = 20;

  // Abort timeouts (ms)
  const TMO_FAST = 8000;
  const TMO_SLOW = 12000;

  // In-memory cache TTLs (ms) — the worker itself also KV-caches
  const TTL_SCOREBOARD = 60 * 1000;
  const TTL_FIXRES = 60 * 1000;
  const TTL_NEWS = 10 * 60 * 1000;
  const TTL_TEAMS = 6 * 60 * 60 * 1000;
  const TTL_STANDINGS = 30 * 60 * 1000;
  const TTL_H2H = 30 * 60 * 1000;

  const DEBUG = !!window.AIML_DEBUG_ESPN;

  // -----------------------------
  // Store (global)
  // -----------------------------
  const STORE = (window.ESPN_STORE = window.ESPN_STORE || {
    version: VERSION,
    meta: { boot_ts: new Date().toISOString() },
    cache: {
      scoreboard: Object.create(null), // key -> {ts,data}
      fixtures: Object.create(null),   // key -> {ts,data}
      results: Object.create(null),    // key -> {ts,data}
      standings: Object.create(null),  // key -> {ts,data,normalized,valueStats}
      teams: Object.create(null),      // key -> {ts,data,normalized,byName,byId}
      news: Object.create(null),       // key -> {ts,data,items}
      h2h: Object.create(null)         // key -> {ts,data}
    }
  });

  // -----------------------------
  // Helpers
  // -----------------------------
  function log() {
    if (!DEBUG) return;
    try { console.log.apply(console, ["[ESPN]", ...arguments]); } catch (_) {}
  }

  function baseUrl() {
    const cfg = window.AIML_LIVE_CFG || {};
    const b = (cfg.liveUltraBase || cfg.fixturesBase || "").trim();
    return b ? b.replace(/\/+$/, "") : "";
  }

  function toYYYYMMDD(input) {
    if (!input) return new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const s = String(input).trim();
    if (/^\d{8}$/.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.replace(/-/g, "");
    return new Date().toISOString().slice(0, 10).replace(/-/g, "");
  }

  function nowMs() { return Date.now(); }

  function isFresh(entry, ttlMs) {
    return entry && entry.ts && (nowMs() - entry.ts) <= ttlMs;
  }

  async function fetchJson(url, timeoutMs) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs || TMO_FAST);

    try {
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        mode: "cors",
        signal: ctrl.signal
      });
      const ok = !!res.ok;
      const status = res.status;

      let data = null;
      try { data = await res.json(); } catch (_) { data = null; }

      return { ok, status, url, data };
    } catch (e) {
      return { ok: false, status: 0, url, error: e && e.message ? e.message : String(e) };
    } finally {
      clearTimeout(t);
    }
  }

  function apiUrl(path) {
    const b = baseUrl();
    if (!b) return "";
    const p = String(path || "");
    return b + (p.startsWith("/") ? p : ("/" + p));
  }

  function emit(name, payload) {
    try { window.emit(name, payload); } catch (_) {}
  }

  // -----------------------------
  // League code mapping (your IDs -> ESPN)
  // -----------------------------
  const MAP = {
    // Common internal IDs
    "ENG1": "eng.1",
    "ENG2": "eng.2",
    "ENG3": "eng.3",
    "ENG4": "eng.4",
    "ESP1": "esp.1",
    "ESP2": "esp.2",
    "ITA1": "ita.1",
    "ITA2": "ita.2",
    "FRA1": "fra.1",
    "FRA2": "fra.2",
    "GER1": "ger.1",
    "GER2": "ger.2",
    "NED1": "ned.1",
    "POR1": "por.1",
    "GRE1": "gre.1",

    // Your historic shortcuts
    "PL": "eng.1",
    "PD": "esp.1",
    "SA": "ita.1",
    "FL1": "fra.1",
    "BL1": "ger.1",

    // UEFA
    "UCL": "uefa.champions",
    "UEL": "uefa.europa",
    "UECL": "uefa.europa.conf"
  };

  function toEspnLeagueCode(input) {
    const s0 = String(input || "").trim();
    if (!s0) return "";
    const s = s0.toUpperCase();

    // If already ESPN form like "ENG.1"
    if (/^[A-Z]{3}\.\d$/.test(s)) return s.toLowerCase();

    // If already like "eng.1"
    if (/^[a-z]{3}\.\d$/.test(s0)) return s0.toLowerCase();

    if (MAP[s]) return MAP[s];

    // If match object passes leagueSlug "ENG.1"
    if (/^[A-Z]{3}\.\d$/.test(s)) return s.toLowerCase();

    return "";
  }

  // -----------------------------
  // Standings normalizer (robust)
  // -----------------------------
  function toNum(x) {
    const n = typeof x === "number" ? x : parseFloat(String(x || "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function flattenEntries(node, out) {
    if (!node) return;
    if (Array.isArray(node.entries)) {
      node.entries.forEach((e) => out.push(e));
    }
    // ESPN often nests inside children
    if (Array.isArray(node.children)) {
      node.children.forEach((ch) => flattenEntries(ch, out));
    }
    // sometimes "standings" key holds the real object
    if (node.standings) flattenEntries(node.standings, out);
  }

  function normalizeStandings(json, leagueCode) {
    // Find a root that contains entries
    const root = json?.standings || json;
    const entries = [];
    flattenEntries(root, entries);

    const rows = entries.map((en) => {
      const team = en?.team || {};
      const stats = Array.isArray(en?.stats) ? en.stats : [];

      const statByName = Object.create(null);
      stats.forEach((st) => {
        const key = String(st?.name || st?.abbreviation || st?.shortDisplayName || st?.displayName || "").trim();
        if (!key) return;
        statByName[key] = st;
      });

      function pick(keys) {
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          if (statByName[k]) return statByName[k];
        }
        return null;
      }

      const rank =
        toNum(en?.stats?.find?.((s) => s?.name === "rank")?.value) ??
        toNum(en?.rank) ??
        null;

      const gp = pick(["gamesPlayed", "GP"]) || null;
      const w  = pick(["wins", "W"]) || null;
      const d  = pick(["ties", "draws", "T", "D"]) || null;
      const l  = pick(["losses", "L"]) || null;

      const pts = pick(["points", "PTS", "P"]) || null;

      const gf = pick(["goalsFor", "GF"]) || null;
      const ga = pick(["goalsAgainst", "GA"]) || null;
      const gd = pick(["goalDifference", "GD"]) || null;

      const form = pick(["lastFive", "form"]) || null;
      const streak = pick(["streak"]) || null;

      const logo = (Array.isArray(team?.logos) && team.logos[0]?.href) ? team.logos[0].href : "";

      return {
        league: leagueCode,
        teamId: team?.id ? String(team.id) : "",
        teamName: team?.displayName || team?.name || "",
        teamShort: team?.shortDisplayName || "",
        abbr: team?.abbreviation || "",
        logo,

        rank: rank,
        played: toNum(gp?.value ?? gp?.displayValue),
        wins: toNum(w?.value ?? w?.displayValue),
        draws: toNum(d?.value ?? d?.displayValue),
        losses: toNum(l?.value ?? l?.displayValue),

        points: toNum(pts?.value ?? pts?.displayValue),

        goalsFor: toNum(gf?.value ?? gf?.displayValue),
        goalsAgainst: toNum(ga?.value ?? ga?.displayValue),
        goalDiff: toNum(gd?.value ?? gd?.displayValue),

        form: form?.displayValue || form?.summary || "",
        streak: streak?.displayValue || streak?.summary || ""
      };
    }).filter((r) => r.teamId && r.teamName);

    // If rank missing, infer from order
    rows.forEach((r, idx) => { if (r.rank == null) r.rank = idx + 1; });

    return rows;
  }

  function buildValueStatsFromStandings(rows) {
    const byTeam = rows.map((r) => {
      const played = r.played || 0;
      const gf = r.goalsFor != null ? r.goalsFor : null;
      const ga = r.goalsAgainst != null ? r.goalsAgainst : null;
      const gd = r.goalDiff != null ? r.goalDiff : (gf != null && ga != null ? (gf - ga) : null);
      const pts = r.points != null ? r.points : null;

      const gfpg = (played > 0 && gf != null) ? (gf / played) : null;
      const gapg = (played > 0 && ga != null) ? (ga / played) : null;
      const gdpg = (played > 0 && gd != null) ? (gd / played) : null;
      const ppg  = (played > 0 && pts != null) ? (pts / played) : null;

      return {
        league: r.league,
        teamId: r.teamId,
        teamName: r.teamName,
        logo: r.logo,
        rank: r.rank,
        played,
        points: pts,
        wins: r.wins,
        draws: r.draws,
        losses: r.losses,
        goalsFor: gf,
        goalsAgainst: ga,
        goalDiff: gd,
        gfpg,
        gapg,
        gdpg,
        ppg,
        form: r.form || "",
        streak: r.streak || ""
      };
    });

    return { teams: byTeam, ts: new Date().toISOString() };
  }

  // -----------------------------
  // Teams normalizer (logos + maps)
  // -----------------------------
  function normalizeTeams(json) {
    const teamsArr = [];
    const sports = Array.isArray(json?.sports) ? json.sports : [];
    const leagues = Array.isArray(sports?.[0]?.leagues) ? sports[0].leagues : [];
    const tw = Array.isArray(leagues?.[0]?.teams) ? leagues[0].teams : [];

    tw.forEach((wrap) => {
      const t = wrap?.team || wrap || {};
      if (!t?.id) return;

      const logos = Array.isArray(t?.logos) ? t.logos : [];
      teamsArr.push({
        id: String(t.id),
        name: t.displayName || t.name || "",
        shortName: t.shortDisplayName || "",
        abbr: t.abbreviation || "",
        logo: logos?.[0]?.href || "",
        logos: logos.map((x) => ({
          href: x?.href || "",
          width: x?.width || null,
          height: x?.height || null,
          rel: x?.rel || null
        }))
      });
    });

    const byId = Object.create(null);
    const byName = Object.create(null);

    teamsArr.forEach((t) => {
      byId[t.id] = t;
      if (t.name) byName[String(t.name).toLowerCase()] = t;
      if (t.shortName) byName[String(t.shortName).toLowerCase()] = t;
      if (t.abbr) byName[String(t.abbr).toLowerCase()] = t;
    });

    return { teams: teamsArr, byId, byName };
  }

  // -----------------------------
  // News normalizer
  // -----------------------------
  function normalizeNews(json) {
    const arr = Array.isArray(json?.articles) ? json.articles : [];
    return arr.map((a) => ({
      headline: a?.headline || "",
      description: a?.description || "",
      published: a?.published || a?.lastModified || "",
      url: a?.links?.web?.href || a?.links?.api?.news?.href || "",
      image: Array.isArray(a?.images) && a.images[0]?.url ? a.images[0].url : "",
      byline: a?.byline || "",
      type: a?.type || ""
    })).filter((x) => x.headline);
  }

  // -----------------------------
  // Core fetch API (cached)
  // -----------------------------
  async function getScoreboard(league, dateYYYYMMDD) {
    const lg = (league || "all").toLowerCase();
    const dateKey = toYYYYMMDD(dateYYYYMMDD);
    const key = `${lg}:${dateKey}`;

    const hit = STORE.cache.scoreboard[key];
    if (isFresh(hit, TTL_SCOREBOARD)) return { ok: true, source: "mem", data: hit.data };

    const url = apiUrl(`/espn/scoreboard?league=${encodeURIComponent(lg)}&date=${encodeURIComponent(dateKey)}`);
    if (!url) return { ok: false, error: "missing_base_url" };

    const r = await fetchJson(url, TMO_FAST);
    if (!r.ok || !r.data) return { ok: false, status: r.status, error: r.error || "fetch_failed", url: r.url };

    STORE.cache.scoreboard[key] = { ts: nowMs(), data: r.data };
    return { ok: true, source: "net", data: r.data };
  }

  async function getFixtures(league, dateYYYYMMDD) {
    const lg = (league || "all").toLowerCase();
    const dateKey = toYYYYMMDD(dateYYYYMMDD);
    const key = `${lg}:${dateKey}`;

    const hit = STORE.cache.fixtures[key];
    if (isFresh(hit, TTL_FIXRES)) return { ok: true, source: "mem", data: hit.data };

    const url = apiUrl(`/espn/fixtures?league=${encodeURIComponent(lg)}&date=${encodeURIComponent(dateKey)}`);
    if (!url) return { ok: false, error: "missing_base_url" };

    const r = await fetchJson(url, TMO_FAST);
    if (!r.ok || !r.data) return { ok: false, status: r.status, error: r.error || "fetch_failed", url: r.url };

    STORE.cache.fixtures[key] = { ts: nowMs(), data: r.data };
    return { ok: true, source: "net", data: r.data };
  }

  async function getResults(league, dateYYYYMMDD) {
    const lg = (league || "all").toLowerCase();
    const dateKey = toYYYYMMDD(dateYYYYMMDD);
    const key = `${lg}:${dateKey}`;

    const hit = STORE.cache.results[key];
    if (isFresh(hit, TTL_FIXRES)) return { ok: true, source: "mem", data: hit.data };

    const url = apiUrl(`/espn/results?league=${encodeURIComponent(lg)}&date=${encodeURIComponent(dateKey)}`);
    if (!url) return { ok: false, error: "missing_base_url" };

    const r = await fetchJson(url, TMO_FAST);
    if (!r.ok || !r.data) return { ok: false, status: r.status, error: r.error || "fetch_failed", url: r.url };

    STORE.cache.results[key] = { ts: nowMs(), data: r.data };
    return { ok: true, source: "net", data: r.data };
  }

  async function getStandings(league, season) {
    const lg = (league || "").toLowerCase();
    if (!lg) return { ok: false, error: "missing_league" };
    const yr = String(season || "").trim() || "";
    const key = `${lg}:${yr || "current"}`;

    const hit = STORE.cache.standings[key];
    if (isFresh(hit, TTL_STANDINGS)) return { ok: true, source: "mem", data: hit.data, normalized: hit.normalized, valueStats: hit.valueStats };

    const qs = `league=${encodeURIComponent(lg)}` + (yr ? `&season=${encodeURIComponent(yr)}` : "");
    const url = apiUrl(`/espn/standings?${qs}`);
    if (!url) return { ok: false, error: "missing_base_url" };

    const r = await fetchJson(url, TMO_SLOW);
    if (!r.ok || !r.data) return { ok: false, status: r.status, error: r.error || "fetch_failed", url: r.url };

    const normalized = normalizeStandings(r.data?.standings || r.data, lg);
    const valueStats = buildValueStatsFromStandings(normalized);

    STORE.cache.standings[key] = { ts: nowMs(), data: r.data, normalized, valueStats };
    return { ok: true, source: "net", data: r.data, normalized, valueStats };
  }

  async function getTeams(league) {
    const lg = (league || "").toLowerCase();
    if (!lg) return { ok: false, error: "missing_league" };
    const key = lg;

    const hit = STORE.cache.teams[key];
    if (isFresh(hit, TTL_TEAMS)) return { ok: true, source: "mem", data: hit.data, normalized: hit.normalized };

    const url = apiUrl(`/espn/teams?league=${encodeURIComponent(lg)}`);
    if (!url) return { ok: false, error: "missing_base_url" };

    const r = await fetchJson(url, TMO_SLOW);
    if (!r.ok || !r.data) return { ok: false, status: r.status, error: r.error || "fetch_failed", url: r.url };

    const normalized = normalizeTeams(r.data);
    STORE.cache.teams[key] = { ts: nowMs(), data: r.data, normalized };

    return { ok: true, source: "net", data: r.data, normalized };
  }

  async function getNews(league, limit) {
    const lg = (league || "").toLowerCase();
    if (!lg) return { ok: false, error: "missing_league" };
    const lim = Math.max(1, Math.min(50, parseInt(limit || DEFAULT_NEWS_LIMIT, 10) || DEFAULT_NEWS_LIMIT));
    const key = `${lg}:${lim}`;

    const hit = STORE.cache.news[key];
    if (isFresh(hit, TTL_NEWS)) return { ok: true, source: "mem", data: hit.data, items: hit.items };

    const url = apiUrl(`/espn/news?league=${encodeURIComponent(lg)}&limit=${encodeURIComponent(lim)}`);
    if (!url) return { ok: false, error: "missing_base_url" };

    const r = await fetchJson(url, TMO_FAST);
    if (!r.ok || !r.data) return { ok: false, status: r.status, error: r.error || "fetch_failed", url: r.url };

    const items = normalizeNews(r.data);
    STORE.cache.news[key] = { ts: nowMs(), data: r.data, items };

    return { ok: true, source: "net", data: r.data, items };
  }

  // -----------------------------
  // H2H hook (requires main endpoint later)
  // -----------------------------
  async function getH2H(league, homeTeamId, awayTeamId, limit) {
    const lg = (league || "").toLowerCase();
    const h = String(homeTeamId || "").trim();
    const a = String(awayTeamId || "").trim();
    const lim = Math.max(1, Math.min(20, parseInt(limit || 10, 10) || 10));

    if (!lg || !h || !a) return { ok: false, error: "missing_params" };

    const key = `${lg}:${h}:${a}:${lim}`;
    const hit = STORE.cache.h2h[key];
    if (isFresh(hit, TTL_H2H)) return { ok: true, source: "mem", data: hit.data };

    // Optional endpoint (add later in aimatchlab-main):
    // /espn/h2h?league=eng.1&homeId=123&awayId=456&limit=10
    const url = apiUrl(`/espn/h2h?league=${encodeURIComponent(lg)}&homeId=${encodeURIComponent(h)}&awayId=${encodeURIComponent(a)}&limit=${encodeURIComponent(lim)}`);
    if (!url) return { ok: false, error: "missing_base_url" };

    const r = await fetchJson(url, TMO_SLOW);
    if (!r.ok || !r.data) return { ok: false, status: r.status, error: r.error || "fetch_failed", url: r.url };

    STORE.cache.h2h[key] = { ts: nowMs(), data: r.data };
    return { ok: true, source: "net", data: r.data };
  }

  // -----------------------------
  // Public API
  // -----------------------------
  const ESPNAdapter = (window.ESPNAdapter = window.ESPNAdapter || {});
  ESPNAdapter.version = VERSION;

  ESPNAdapter.resolveLeague = function (anyCode) {
    return toEspnLeagueCode(anyCode) || (String(anyCode || "").trim().toLowerCase() || "");
  };

  ESPNAdapter.loadLeaguePack = async function (leagueCode, opts) {
    const league = ESPNAdapter.resolveLeague(leagueCode);
    if (!league) return;

    const season = opts && opts.season ? String(opts.season) : "";
    const newsLimit = opts && opts.newsLimit ? opts.newsLimit : DEFAULT_NEWS_LIMIT;

    log("loadLeaguePack", league, season);

    const [st, tm, nw] = await Promise.allSettled([
      getStandings(league, season),
      getTeams(league),
      getNews(league, newsLimit)
    ]);

    if (st.status === "fulfilled" && st.value && st.value.ok) {
      emit("espn:standings:loaded", {
        league,
        season: season || null,
        source: st.value.source,
        raw: st.value.data,
        normalized: st.value.normalized
      });

      // Value feed (separate event, does NOT touch current value:update pipeline)
      emit("espn:value:stats", {
        league,
        season: season || null,
        source: st.value.source,
        stats: st.value.valueStats
      });
    } else {
      emit("espn:standings:error", { league, season: season || null, error: st?.reason || "failed" });
    }

    if (tm.status === "fulfilled" && tm.value && tm.value.ok) {
      emit("espn:teams:loaded", {
        league,
        source: tm.value.source,
        raw: tm.value.data,
        teams: tm.value.normalized.teams
      });
    } else {
      emit("espn:teams:error", { league, error: tm?.reason || "failed" });
    }

    if (nw.status === "fulfilled" && nw.value && nw.value.ok) {
      emit("espn:news:loaded", {
        league,
        limit: newsLimit,
        source: nw.value.source,
        raw: nw.value.data,
        items: nw.value.items
      });
    } else {
      emit("espn:news:error", { league, error: nw?.reason || "failed" });
    }
  };

  ESPNAdapter.loadDay = async function (dateYYYYMMDD, leagueCode) {
    const dateKey = toYYYYMMDD(dateYYYYMMDD);
    const league = leagueCode ? ESPNAdapter.resolveLeague(leagueCode) : "all";

    log("loadDay", league, dateKey);

    const [fx, rs] = await Promise.allSettled([
      getFixtures(league, dateKey),
      getResults(league, dateKey)
    ]);

    if (fx.status === "fulfilled" && fx.value && fx.value.ok) {
      emit("espn:fixtures:loaded", fx.value.data);
    } else {
      emit("espn:fixtures:error", { league, date: dateKey });
    }

    if (rs.status === "fulfilled" && rs.value && rs.value.ok) {
      emit("espn:results:loaded", rs.value.data);
    } else {
      emit("espn:results:error", { league, date: dateKey });
    }
  };

  ESPNAdapter.getTeamLogo = function (leagueCode, teamNameOrId) {
    const league = ESPNAdapter.resolveLeague(leagueCode);
    const hit = STORE.cache.teams[league];
    if (!hit || !hit.normalized) return "";

    const q = String(teamNameOrId || "").trim();
    if (!q) return "";

    // id
    if (hit.normalized.byId && hit.normalized.byId[q]) return hit.normalized.byId[q].logo || "";

    // name
    const k = q.toLowerCase();
    if (hit.normalized.byName && hit.normalized.byName[k]) return hit.normalized.byName[k].logo || "";

    return "";
  };

  ESPNAdapter.loadH2HForMatch = async function (match, opts) {
    const league = ESPNAdapter.resolveLeague(match?.leagueSlug || match?.leagueCode || match?.league || "");
    const homeId = match?.homeId || match?.homeTeamId || "";
    const awayId = match?.awayId || match?.awayTeamId || "";
    const lim = opts && opts.limit ? opts.limit : 10;

    if (!league || !homeId || !awayId) {
      emit("espn:h2h:unavailable", { league, reason: "missing_ids" });
      return;
    }

    const r = await getH2H(league, homeId, awayId, lim);
    if (r.ok) emit("espn:h2h:loaded", { league, homeId, awayId, source: r.source, data: r.data });
    else emit("espn:h2h:unavailable", { league, homeId, awayId, reason: r.error || "unavailable" });
  };

  // -----------------------------
  // Event wiring
  // -----------------------------
  // 1) When a league is selected from accordion navigation
  window.on("league-selected", function (p) {
    const id = p?.id || p?.leagueId || p?.league || "";
    const name = p?.name || "";
    const league = ESPNAdapter.resolveLeague(id) || ESPNAdapter.resolveLeague(name);

    if (!league) return;
    ESPNAdapter.loadLeaguePack(league, { newsLimit: DEFAULT_NEWS_LIMIT });
  });

  // 2) When Today panel loads matches, we can prefetch "ALL day" fixtures+results if desired
  // (kept off by default; enable by setting window.AIML_ESPN_PREFETCH_DAY = true)
  window.on("today-matches:loaded", function (p) {
    if (!window.AIML_ESPN_PREFETCH_DAY) return;
    const dk = p?.dateKey || "";
    ESPNAdapter.loadDay(dk, "all");
  });

  // 3) When a match is selected, allow optional H2H if IDs exist and endpoint is available
  // (kept off by default; enable by setting window.AIML_ESPN_H2H = true)
  window.on("match-selected", function (m) {
    if (!window.AIML_ESPN_H2H) return;
    ESPNAdapter.loadH2HForMatch(m, { limit: 10 });
  });

  // Boot marker
  emit("espn:adapter:ready", { version: VERSION, ts: new Date().toISOString() });
  log("ready", VERSION);
})();
