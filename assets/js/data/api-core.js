// ====================================================================
// API CORE — Single Access Point for All Data
// Caches heavy requests to avoid credit waste.
// ====================================================================

const CACHE = {
  fixtures: { t: 0, data: null },
  odds: { t: 0, data: null },
  standings: {},
  radar: { t: 0, data: null },
};

const DAY = 24 * 60 * 60 * 1000;
const SIX_HOURS = 6 * 60 * 60 * 1000;

export const API = {

  // ------------------------------------------------------------
  // FIXTURES (once per day)
  // ------------------------------------------------------------
  async getFixtures() {
    if (Date.now() - CACHE.fixtures.t < DAY && CACHE.fixtures.data) {
      return CACHE.fixtures.data;
    }
    const url = "https://api-football.trial/v3/fixtures?next=60";
    const r = await fetch(url);
    const j = await r.json();
    CACHE.fixtures = { t: Date.now(), data: j };
    return j;
  },

  // ------------------------------------------------------------
  // ODDS (once per day)
  // ------------------------------------------------------------
  async getOdds() {
    if (Date.now() - CACHE.odds.t < DAY && CACHE.odds.data) {
      return CACHE.odds.data;
    }
    const url = "https://api-football.trial/v3/odds?bookmakers=2&markets=1x2";
    const r = await fetch(url);
    const j = await r.json();
    CACHE.odds = { t: Date.now(), data: j };
    return j;
  },

  // ------------------------------------------------------------
  // STANDINGS (once per day per league)
  // ------------------------------------------------------------
  async getStandings(leagueId) {
    if (
      CACHE.standings[leagueId] &&
      Date.now() - CACHE.standings[leagueId].t < DAY
    ) {
      return CACHE.standings[leagueId].data;
    }

    const url = `https://api-football.trial/v3/standings?league=${leagueId}&season=2024`;
    const r = await fetch(url);
    const j = await r.json();

    CACHE.standings[leagueId] = { t: Date.now(), data: j };

    return j;
  },

  // ------------------------------------------------------------
  // RADAR (big movements) once per 6 hours
  // ------------------------------------------------------------
  async getRadar() {
    if (Date.now() - CACHE.radar.t < SIX_HOURS && CACHE.radar.data) {
      return CACHE.radar.data;
    }
    const url = `https://api-football.trial/v3/odds/live`;
    const r = await fetch(url);
    const j = await r.json();
    CACHE.radar = { t: Date.now(), data: j };
    return j;
  },

  // ------------------------------------------------------------
  // LIVE MATCH (on-demand)
  // ------------------------------------------------------------
  async getLiveMatch(matchId) {
    const url = `https://api-football.trial/v3/fixtures?id=${matchId}`;
    const r = await fetch(url);
    return await r.json();
  }
};
