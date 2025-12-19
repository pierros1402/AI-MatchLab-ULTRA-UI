/* =========================================================
   AI MATCHLAB ULTRA — LIVE ADAPTER v1.6 (AUTO DAILY + TOP DIVISIONS ONLY)
   - Auto range:
       Mon–Thu: TODAY
       Fri–Sun: Fri→Sun window
   - Competitions (football-data): Top 5 only + (Greece via TSDB)
       PL,PD,BL1,SA,FL1
     Greece is not reliably covered by football-data codes; TSDB is used as supplement.
   - TSDB filtering: STRICT top divisions (NO Championship/2nd tiers)
   - Emits:
       today-matches:loaded (from /fixtures)
       live:update          (from /live-ultra)  [optional]
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
  var emitLive  = (CFG.emitLive  === true); // default OFF for clarity

  var pollTodayMs = Number(CFG.pollTodayMs || 600000); // 10 min
  var pollLiveMs  = Number(CFG.pollLiveMs  || 60000);  // 60 sec
  var timeoutMs   = Number(CFG.timeoutMs   || 9000);

  var debug = !!CFG.debug;
  function log() { if (debug) console.log.apply(console, arguments); }
  function emitSafe(evt, payload) { if (typeof window.emit === "function") window.emit(evt, payload); }

  // Auto range on by default
  var autoRange = (CFG.autoRange !== false);

  // Football-data competitions (Top 5)
  // Note: Greece is handled via TSDB supplement; keep FD list clean.
  var primaryCompetitions = String(CFG.competitions || "PL,PD,BL1,SA,FL1").trim();

  // TSDB supplement is ON by default (to help Greece)
  var useTSDB = (CFG.useTSDB !== false);
  var useFD   = (CFG.useFD   !== false);

  // If primary result is smaller than this, we still emit (it can be a quiet day).
  var minPrimaryCount = Number(CFG.minPrimaryCount || 0);

  // STRICT TSDB filter for top divisions only (no Championship / no 2nd tiers)
  var strictTopDivisions = (CFG.strictTopDivisions !== false);

  // Include Greece in TSDB filter
  var includeGreece = (CFG.includeGreece !== false);

  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function isoDate(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  function rangeAuto() {
    var now = new Date();
    if (!autoRange) {
      var s = isoDate(now);
      return { from: s, to: s, mode: "today" };
    }

    var day = now.getDay(); // 0=Sun..6=Sat
    if (day >= 1 && day <= 4) {
      var s1 = isoDate(now);
      return { from: s1, to: s1, mode: "today" };
    }

    // Fri/Sat/Sun => Fri→Sun
    var base = startOfDay(now);
    var shiftToFri = (day === 5) ? 0 : (day === 6 ? -1 : -2);
    base.setDate(base.getDate() + shiftToFri);
    var fri = base;
    var sun = new Date(fri); sun.setDate(fri.getDate() + 2);
    return { from: isoDate(fri), to: isoDate(sun), mode: "fri-sun" };
  }

  function fetchJSON(url) {
    var ctrl = new AbortController();
    var t = setTimeout(function () { try { ctrl.abort(); } catch (_) {} }, timeoutMs);

    return fetch(url, { signal: ctrl.signal, credentials: "omit" })
      .then(function (r) {
        clearTimeout(t);
        return r.text().then(function (txt) {
          var data = null;
          try { data = txt ? JSON.parse(txt) : null; } catch (_) { data = null; }
          return { ok: r.ok, status: r.status, data: data };
        });
      })
      .catch(function (e) {
        clearTimeout(t);
        return { ok: false, status: 0, data: null, error: e && e.message ? e.message : "network_error" };
      });
  }

  function buildFixturesURL(dateFrom, dateTo, comps) {
    var u = new URL(BASE + fixturesPath);
    u.searchParams.set("dateFrom", dateFrom);
    u.searchParams.set("dateTo", dateTo);
    u.searchParams.set("fd", useFD ? "1" : "0");
    u.searchParams.set("tsdb", useTSDB ? "1" : "0");
    if (comps) u.searchParams.set("competitions", comps);
    return u.toString();
  }

  // TSDB strict league allow-list
  function isAllowedTSDBLeague(leagueLower) {
    if (!strictTopDivisions) return true;
    if (!leagueLower) return false;

    // hard exclusions (avoid 2nd tiers)
    if (leagueLower.indexOf("championship") >= 0) return false;
    if (leagueLower.indexOf("segunda") >= 0) return false;
    if (leagueLower.indexOf("serie b") >= 0) return false;
    if (leagueLower.indexOf("ligue 2") >= 0) return false;
    if (leagueLower.indexOf("2. bundesliga") >= 0) return false;
    if (leagueLower.indexOf("bundesliga 2") >= 0) return false;

    // Top 5
    if (leagueLower.indexOf("premier league") >= 0) return true;
    if (leagueLower.indexOf("la liga") >= 0) return true;
    if (leagueLower.indexOf("bundesliga") >= 0) return true; // after exclusions
    if (leagueLower.indexOf("serie a") >= 0) return true;
    if (leagueLower.indexOf("ligue 1") >= 0) return true;

    // Greece (variations)
    if (includeGreece) {
      if (leagueLower.indexOf("super league greece") >= 0) return true;
      if (leagueLower.indexOf("greek super league") >= 0) return true;
      if (leagueLower.indexOf("stoiximan super league") >= 0) return true;
      if (leagueLower.indexOf("superleague greece") >= 0) return true;
      if (leagueLower.indexOf("super league 1") >= 0) return true;
    }

    return false;
  }

  function filterMatchesStrict(arr) {
    return (arr || []).filter(function (m) {
      if (!m) return false;
      var p = (m.provider || "").toLowerCase();
      if (p !== "thesportsdb") return true; // keep football-data results

      var league = (m.league || "").toLowerCase();
      return isAllowedTSDBLeague(league);
    });
  }

  function mergeAndDedupe(arr) {
    var out = [];
    var seen = Object.create(null);
    (arr || []).forEach(function (m) {
      if (!m) return;
      var id = m.id || m.matchId || m.match_id || null;
      if (!id) return;
      if (seen[id]) return;
      seen[id] = 1;
      out.push(m);
    });
    return out;
  }

  async function tickToday() {
    if (!emitToday) return;

    var rge = rangeAuto();
    var url1 = buildFixturesURL(rge.from, rge.to, primaryCompetitions);

    var r1 = await fetchJSON(url1);
    if (!r1.ok || !r1.data || r1.data.ok !== true) return;

    var matches = Array.isArray(r1.data.matches) ? r1.data.matches : [];
    matches = filterMatchesStrict(matches);
    matches = mergeAndDedupe(matches);

    if (matches.length < minPrimaryCount) {
      // still emit, quiet days happen
    }

    emitSafe("today-matches:loaded", {
      ts: Date.now(),
      source: "live-adapter",
      mode: "auto",
      range_mode: rge.mode,
      dateFrom: rge.from,
      dateTo: rge.to,
      competitions: primaryCompetitions || null,
      matches: matches
    });

    log("[LIVE-ADAPTER] today-matches:loaded", matches.length, rge.from, rge.to, rge.mode);
  }

  function mapLiveToItems(data) {
    var arr = (data && Array.isArray(data.matches)) ? data.matches : [];
    return arr.map(function (m) {
      var id = m.match_id || m.id || null;
      var home = (m.teams && m.teams.home && m.teams.home.name) || m.home || "Home";
      var away = (m.teams && m.teams.away && m.teams.away.name) || m.away || "Away";
      var minute = (m.status && m.status.minute) || m.minute || null;

      var sh = (m.score && m.score.live && m.score.live.home != null) ? m.score.live.home
             : (m.score && m.score.ft && m.score.ft.home != null) ? m.score.ft.home : null;
      var sa = (m.score && m.score.live && m.score.live.away != null) ? m.score.live.away
             : (m.score && m.score.ft && m.score.ft.away != null) ? m.score.ft.away : null;

      return {
        id: id,
        title: home + " vs " + away,
        home: home,
        away: away,
        minute: minute,
        score: { home: sh, away: sa },
        score_text: (sh != null && sa != null) ? (sh + "-" + sa) : ""
      };
    }).filter(function (x) { return !!x.id; });
  }

  async function tickLive() {
    if (!emitLive) return;

    var r = await fetchJSON(BASE + livePath);
    if (!r.ok || !r.data) return;

    var items = mapLiveToItems(r.data);
    emitSafe("live:update", { ts: Date.now(), source: "live-adapter", items: items });
    log("[LIVE-ADAPTER] live:update", items.length);
  }

  function start() {
    tickToday();
    tickLive();
    setInterval(tickToday, Math.max(30000, pollTodayMs));
    setInterval(tickLive, Math.max(5000, pollLiveMs));
  }

  // Wait for event bus
  (function waitBus() {
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      if (typeof window.emit === "function") {
        clearInterval(t);
        start();
      }
      if (tries > 200) clearInterval(t);
    }, 50);
  })();

})();