/* =========================================================
   AI MATCHLAB ULTRA — LIVE ADAPTER v1.9.0 (FINAL)
========================================================= */
(function () {
  "use strict";
  var CFG = window.AIML_LIVE_CFG || {};
  if (CFG.enabled === false) return;

  var BASE = String(CFG.liveUltraBase || "").replace(/\/+$/, "");
  if (!BASE) return;

  var fixturesPath = String(CFG.fixturesPath || "/fixtures");
  var livePath = String(CFG.liveUltraPath || "/live-ultra");
  var emitToday = (CFG.emitToday !== false);
  var emitLive = (CFG.emitLive !== false);
  var pollTodayMs = Number(CFG.pollTodayMs || 600000);
  var pollLiveMs = Number(CFG.pollLiveMs || 60000);
  var timeoutMs = Number(CFG.timeoutMs || 9000);
  var debug = !!CFG.debug;
  function log() { if (debug) console.log.apply(console, arguments); }
  function emitSafe(evt, p) { if (typeof window.emit === "function") window.emit(evt, p); }

  function fetchJSON(url) {
    var ctrl = new AbortController();
    var t = setTimeout(() => { try { ctrl.abort(); } catch (_) {} }, timeoutMs);
    return fetch(url, { signal: ctrl.signal })
      .then(r => r.text().then(txt => {
        clearTimeout(t);
        try { return { ok: r.ok, status: r.status, data: JSON.parse(txt || "null") }; }
        catch { return { ok: r.ok, status: r.status, data: null }; }
      }))
      .catch(e => { clearTimeout(t); return { ok: false, status: 0, data: null, error: e?.message }; });
  }

  function rangeAuto() {
    const s = new Date().toISOString().slice(0, 10);
    return { from: s, to: s, mode: "today" };
  }

  function normalizeTodayMatches(payload) {
    const out = [];
    const arr = Array.isArray(payload?.matches) ? payload.matches : [];
    for (let i = 0; i < arr.length; i++) {
      const m = arr[i] || {};
      out.push({
        id: String(m.id || m.matchId || ("m_" + i)),
        home: String(m.home || m.homeTeam?.name || ""),
        away: String(m.away || m.awayTeam?.name || ""),
        leagueId: String(m.leagueId || m.league_id || ""),
        leagueName: String(m.leagueName || m.league_name || m.league || "Unknown"),
        leagueSlug: String(m.leagueSlug || m.league_slug || ""),
        status: String(m.status || ""),
        score_text: String(m.score_text || m.score || ""),
        minute: m.minute || null,
        utcDate: String(m.utcDate || m.date || ""),
        date_utc: String(m.date_utc || "")
      });
    }
    return out;
  }

  async function tickToday() {
    if (!emitToday) return;
    const rge = rangeAuto();
    const url = `${BASE}${fixturesPath}?date=${encodeURIComponent(rge.from)}`;
    const r = await fetchJSON(url);
    if (!r.ok || !r.data) return;
    const matches = normalizeTodayMatches(r.data);
    emitSafe("today-matches:loaded", { ts: Date.now(), source: "live-adapter", dateFrom: rge.from, matches });
    log("[LIVE-ADAPTER] today-matches:loaded", matches.length, rge.from);
  }

  function parseScoreAny(m) {
    if (typeof m.score === "string") return { text: m.score };
    if (m.score?.fullTime) return { text: `${m.score.fullTime.home}-${m.score.fullTime.away}` };
    return { text: "" };
  }
  function isLiveStatus(s) {
    s = String(s || "").toUpperCase();
    return s.includes("LIVE") || s.includes("PLAY") || s === "1H" || s === "2H";
  }
  function mapLiveToItems(data) {
    const arr = Array.isArray(data?.matches) ? data.matches : [];
    return arr.map(m => ({
      id: m.match_id || m.id,
      home: m.teams?.home?.name || m.home || "",
      away: m.teams?.away?.name || m.away || "",
      minute: m.status?.minute || m.minute || null,
      status: m.status?.code || m.status || "",
      score_text: parseScoreAny(m).text,
      leagueId: m.leagueId || "",
      leagueName: m.leagueName || "",
      leagueSlug: m.leagueSlug || ""
    })).filter(x => !!x.id);
  }

  async function tickLive() {
    if (!emitLive) return;
    const r = await fetchJSON(BASE + livePath);
    if (!r.ok || !r.data) return;
    const items = mapLiveToItems(r.data);
    const matches = items.filter(x => isLiveStatus(x.status) || x.minute != null);
    emitSafe("live:update", { ts: Date.now(), source: "live-adapter", items, matches });
    log("[LIVE-ADAPTER] live:update", matches.length);
  }

  function start() {
    tickToday(); tickLive();
    setInterval(tickToday, Math.max(30000, pollTodayMs));
    setInterval(tickLive, Math.max(5000, pollLiveMs));
  }
  (function waitBus() {
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (typeof window.emit === "function") { clearInterval(t); start(); }
      if (tries > 200) clearInterval(t);
    }, 50);
  })();
})();
