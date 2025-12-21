/* =========================================================
   AI MATCHLAB ULTRA — LIVE ADAPTER v1.8
   AUTO TODAY (Top divisions only) + LIVE parsing for Unified Live worker
   - Today:
       Mon–Thu: TODAY → Thu window
       Fri–Sun: TODAY → Sun window
       football-data competitions: PL,PD,BL1,SA,FL1
       TSDB supplement (for Greece) filtered to TOP divisions only
   - Live:
       Reads /live-ultra (main worker) and emits live:update items + matches
       Supports matches where score is either:
         a) {score:{live:{home,away}}} style
         b) "1-0" string (Unified Live worker: FotMob/OpenLigaDB)
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

  function pad2(n) { n = Number(n || 0); return (n < 10 ? "0" : "") + n; }
  function startOfDay(d) { var x = new Date(d); x.setHours(0,0,0,0); return x; }
  function isoDate(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }

  // Auto range on by default
  var autoRange = (CFG.autoRange !== false);

  // Football-data competitions (Top 5)
  var primaryCompetitions = String(CFG.competitions || "PL,PD,BL1,SA,FL1").trim();

  // TSDB supplement is ON by default (to help Greece)
  var useTSDB = (CFG.useTSDB !== false);
  var useFD   = (CFG.useFD   !== false);

  // STRICT TSDB filter for top divisions only
  var strictTopDivisions = (CFG.strictTopDivisions !== false);
  var includeGreece = (CFG.includeGreece !== false);

  function rangeAuto() {
    var now = new Date();
    if (!autoRange) {
      var s = isoDate(now);
      return { from: s, to: s, mode: "today" };
    }

    var day = now.getDay(); // 0=Sun..6=Sat
    var from = isoDate(now);

    // Mon–Thu => from TODAY → Thu (same week)
    if (day >= 1 && day <= 4) {
      var base = startOfDay(now);
      var diffToThu = 4 - day; // Mon(1)->3, Tue(2)->2, Wed(3)->1, Thu(4)->0
      var thu = new Date(base); thu.setDate(base.getDate() + diffToThu);
      return { from: from, to: isoDate(thu), mode: "mon-thu" };
    }

    // Fri/Sat/Sun => from TODAY → Sun (same week)
    var base2 = startOfDay(now);
    var diffToSun = (day === 5) ? 2 : (day === 6 ? 1 : 0); // Fri->Sun, Sat->Sun, Sun->Sun
    var sun = new Date(base2); sun.setDate(base2.getDate() + diffToSun);
    return { from: from, to: isoDate(sun), mode: "fri-sun" };
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

  function normalizeTodayMatches(payload) {
    var out = [];
    var matches = payload && Array.isArray(payload.matches) ? payload.matches : [];
    for (var i = 0; i < matches.length; i++) {
      var m = matches[i] || {};
      var id = m.id || m.matchId || m.match_id || ("m_" + i);

      var home = m.home || (m.homeTeam && m.homeTeam.name) || m.homeTeam || "";
      var away = m.away || (m.awayTeam && m.awayTeam.name) || m.awayTeam || "";

      var league = m.league || m.competition || m.tournament || "";
      var utcDate = m.utcDate || m.date || m.date_utc || "";

      out.push({
        id: String(id),
        home: String(home || ""),
        away: String(away || ""),
        league: String(league || ""),
        utcDate: utcDate ? String(utcDate) : "",
        date_utc: m.date_utc ? String(m.date_utc) : ""
      });
    }
    return out;
  }

  async function tickToday() {
    if (!emitToday) return;

    var rge = rangeAuto();
    var qs = "?dateFrom=" + encodeURIComponent(rge.from) +
             "&dateTo=" + encodeURIComponent(rge.to);

    var url = BASE + fixturesPath + qs;
    var r = await fetchJSON(url);
    if (!r.ok || !r.data) return;

    var matches = normalizeTodayMatches(r.data);

    emitSafe("today-matches:loaded", {
      ts: Date.now(),
      source: "live-adapter",
      range_mode: rge.mode,
      dateFrom: rge.from,
      dateTo: rge.to,
      competitions: primaryCompetitions || null,
      matches: matches
    });

    log("[LIVE-ADAPTER] today-matches:loaded", matches.length, rge.from, rge.to, rge.mode);
  }

  function parseScoreAny(m) {
    var sh = null, sa = null;

    if (m && m.score && typeof m.score === "object") {
      if (m.score.fullTime) {
        sh = m.score.fullTime.home;
        sa = m.score.fullTime.away;
      } else if (m.score.live) {
        sh = m.score.live.home;
        sa = m.score.live.away;
      }
    }

    if ((sh == null || sa == null) && typeof m.score === "string") {
      var s = String(m.score);
      var parts = s.split("-");
      if (parts.length === 2) {
        var a = Number(parts[0].trim());
        var b = Number(parts[1].trim());
        if (!isNaN(a) && !isNaN(b)) { sh = a; sa = b; }
      }
    }

    return { home: sh, away: sa };
  }

  function isLiveStatus(s) {
    s = String(s || "").toUpperCase();
    if (!s) return false;
    return (s === "LIVE" || s === "IN_PLAY" || s === "INPLAY" ||
            s.indexOf("LIVE") >= 0 || s.indexOf("PLAY") >= 0 ||
            s === "1H" || s === "2H" || s === "HT");
  }

  function mapLiveToItems(data) {
    var arr = (data && Array.isArray(data.matches)) ? data.matches : [];
    return arr.map(function (m) {
      var id = m.match_id || m.id || null;

      var home = (m.teams && m.teams.home && m.teams.home.name) || m.home || m.homeTeam || "Home";
      var away = (m.teams && m.teams.away && m.teams.away.name) || m.away || m.awayTeam || "Away";

      var minute = (m.status && m.status.minute) || m.minute || null;
      if (minute == null && m.matchTime != null) minute = m.matchTime;

      var status = (m.status && m.status.code) || m.status || m.state || null;

      var sc = parseScoreAny(m);
      var score_text = (sc.home != null && sc.away != null)
        ? (String(sc.home) + "-" + String(sc.away))
        : (typeof m.score === "string" ? String(m.score) : "");

      return {
        id: id,
        title: home + " vs " + away,
        home: home,
        away: away,
        minute: minute,
        score: { home: sc.home, away: sc.away },
        status: status,
        score_text: score_text
      };
    }).filter(function (x) { return !!x.id; });
  }

  async function tickLive() {
    if (!emitLive) return;

    var r = await fetchJSON(BASE + livePath);
    if (!r.ok || !r.data) return;

    var items = mapLiveToItems(r.data);

    // Right Panels expect p.matches (simple objects). Keep p.items too (back-compat).
    var matches = items
      .filter(function (it) { return isLiveStatus(it.status) || (it.minute != null && it.minute !== ""); })
      .map(function (it) {
        return {
          id: it.id,
          home: it.home,
          away: it.away,
          minute: it.minute,
          score: it.score_text || "",
          title: it.title
        };
      });

    emitSafe("live:update", { ts: Date.now(), source: "live-adapter", items: items, matches: matches });
    log("[LIVE-ADAPTER] live:update", matches.length);
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
