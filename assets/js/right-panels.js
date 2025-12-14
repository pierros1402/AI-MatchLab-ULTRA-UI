/* ============================================================
   AI MatchLab ULTRA — RIGHT PANELS (Top Picks + Live)
   - Classic script (no modules)
   - Uses global event bus: window.on / window.emit (from ui/app.js)
   - Demo-friendly: consumes events from demo/odds-demo-feed.js:
       • "matches-loaded"
       • "odds-demo:update"
       • "odds-snapshot"
   - Future-ready: consumes optional:
       • "live-updated" { matches: [...] }
       • "market-selected" { key }
   Targets (must exist in index.html):
       • picks-list, picks-meta
       • live-list, live-meta
============================================================ */

(function () {
  "use strict";

  if (window.__AIML_RIGHT_PANELS_V2__) return;
  window.__AIML_RIGHT_PANELS_V2__ = true;

  var $ = function (id) { return document.getElementById(id); };

  var elPicks = $("picks-list");
  var elPicksMeta = $("picks-meta");
  var elLive = $("live-list");
  var elLiveMeta = $("live-meta");

  var state = {
    activeMarket: "1X2",
    currentMatch: null,
    lastOddsPayload: null,
    demoMatches: [],
    liveMatches: [],
    liveTimer: null,
    demoMode: false
  };

  // -----------------------------
  // Utils
  // -----------------------------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function num(x) {
    var n = Number(x);
    return isFinite(n) ? n : null;
  }

  function fmtOdd(x) {
    var n = num(x);
    if (n == null) return "—";
    return n.toFixed(2);
  }

  function badge(text, tone) {
    var bg =
      tone === "hi" ? "rgba(61,234,255,.20)" :
      tone === "mid" ? "rgba(255,184,61,.18)" :
      tone === "low" ? "rgba(180,180,180,.14)" :
      "rgba(255,255,255,.10)";
    var bd =
      tone === "hi" ? "rgba(61,234,255,.40)" :
      tone === "mid" ? "rgba(255,184,61,.35)" :
      tone === "low" ? "rgba(255,255,255,.20)" :
      "rgba(255,255,255,.18)";
    return '<span style="display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;border:1px solid ' + bd + ';background:' + bg + ';font-size:11px;font-weight:900;">' + esc(text) + '</span>';
  }

  function setMeta(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  // -----------------------------
  // Top Picks (Value-ish via line moves)
  // -----------------------------
  function buildTopPicks(payload) {
    if (!payload || !payload.providers) return [];

    var mk = state.activeMarket || "1X2";
    var providers = payload.providers;
    var provKeys = ["greek", "eu", "asian", "betfair"];

    // Aggregate biggest |Δ| per selection across providers
    var sels = ["1", "X", "2"];
    var best = { "1": null, "X": null, "2": null };

    for (var i = 0; i < provKeys.length; i++) {
      var k = provKeys[i];
      var prov = providers[k];
      if (!prov || !prov.markets) continue;

      var mkData = prov.markets[mk] || prov.markets[String(mk).toUpperCase()] || null;
      if (!mkData || typeof mkData !== "object") continue;

      for (var s = 0; s < sels.length; s++) {
        var sel = sels[s];
        var cell = mkData[sel] || mkData[(sel === "1" ? "H" : sel === "2" ? "A" : "D")] || null;
        if (!cell || typeof cell !== "object") continue;

        var opening = num(cell.opening != null ? cell.opening : cell.open);
        var current = num(cell.current != null ? cell.current : cell.cur);
        if (opening == null || current == null) continue;

        var delta = current - opening;
        var abs = Math.abs(delta);

        if (!best[sel] || abs > best[sel].abs) {
          best[sel] = {
            sel: sel,
            source: k.toUpperCase(),
            opening: opening,
            current: current,
            delta: delta,
            abs: abs
          };
        }
      }
    }

    var out = [];
    for (var j = 0; j < sels.length; j++) {
      var b = best[sels[j]];
      if (!b) continue;
      if (b.abs < 0.20) continue; // match RADAR threshold
      out.push(b);
    }

    out.sort(function (a, b) { return (b.abs || 0) - (a.abs || 0); });
    return out.slice(0, 6);
  }

  function renderTopPicks(payload) {
    if (!elPicks) return;

    var match = state.currentMatch;
    var picks = buildTopPicks(payload);

    if (!picks.length) {
      elPicks.innerHTML =
        '<div style="opacity:.75; font-size:12px; padding:8px 6px;">' +
        (match ? 'No picks above threshold for <b>' + esc(match.home || "Home") + ' vs ' + esc(match.away || "Away") + '</b>.' : "Select a match to generate picks.") +
        "</div>";
      setMeta(elPicksMeta, state.demoMode ? "Demo signals" : "No signals");
      return;
    }

    var title =
      match ? (esc(match.home || "Home") + " vs " + esc(match.away || "Away")) : "Top Picks";

    var html = '';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 6px 10px 6px;border-bottom:1px solid rgba(255,255,255,.10);margin-bottom:10px;">';
    html +=   '<div style="font-weight:900;">' + title + '</div>';
    html +=   '<div style="opacity:.75;font-size:12px;">Market: <b>' + esc(state.activeMarket) + '</b></div>';
    html += '</div>';

    for (var i = 0; i < picks.length; i++) {
      var p = picks[i];

      var tone = p.abs >= 0.35 ? "hi" : (p.abs >= 0.25 ? "mid" : "low");
      var dir = p.delta >= 0 ? ("DRIFT +" + p.delta.toFixed(2)) : ("STEAM " + p.delta.toFixed(2));
      var selLabel = (p.sel === "1") ? "1 (Home)" : (p.sel === "2") ? "2 (Away)" : "X (Draw)";

      html += '<div style="display:flex;flex-direction:column;gap:6px;padding:10px 10px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.04);margin:10px 6px;">';
      html +=   '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">';
      html +=     '<div style="font-weight:900;">' + esc(selLabel) + '</div>';
      html +=     badge(dir, tone);
      html +=   '</div>';
      html +=   '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;opacity:.85;">';
      html +=     '<div>' + esc(p.source) + '</div>';
      html +=     '<div>' + esc(fmtOdd(p.opening)) + ' → <b>' + esc(fmtOdd(p.current)) + '</b></div>';
      html +=   '</div>';
      html += '</div>';
    }

    elPicks.innerHTML = html;
    setMeta(elPicksMeta, state.demoMode ? "Demo value signals" : "Value signals");
  }

  // -----------------------------
  // Live (demo or future live-updated)
  // -----------------------------
  function normalizeLiveMatches(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(function (m, i) {
      return {
        id: m.id || m.matchId || ("LIVE_" + (i + 1)),
        home: m.home || m.homeTeam || "Home",
        away: m.away || m.awayTeam || "Away",
        league: m.league || m.competition || "",
        minute: typeof m.minute === "number" ? m.minute : 0,
        status: m.status || "LIVE",
        score: m.score || "0 - 0"
      };
    });
  }

  function renderLive(list) {
    if (!elLive) return;

    if (!list || !list.length) {
      elLive.innerHTML = '<div style="opacity:.75; font-size:12px; padding:8px 6px;">No live matches.</div>';
      setMeta(elLiveMeta, state.demoMode ? "Demo off" : "Service offline");
      return;
    }

    var html = '';
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      var min = (m.status === "FT") ? "FT" : ((m.minute || 0) + "'");
      html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 10px;border:1px solid rgba(255,255,255,.10);border-radius:14px;background:rgba(0,0,0,.16);margin:8px 6px;">';
      html +=   '<div style="min-width:0;">';
      html +=     '<div style="font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(m.home) + ' vs ' + esc(m.away) + '</div>';
      html +=     '<div style="opacity:.75;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(m.league) + '</div>';
      html +=   '</div>';
      html +=   '<div style="text-align:right;">';
      html +=     '<div style="font-weight:900;">' + esc(min) + '</div>';
      html +=     '<div style="opacity:.85;font-size:12px;">' + esc(m.score) + '</div>';
      html +=   '</div>';
      html += '</div>';
    }

    elLive.innerHTML = html;
    setMeta(elLiveMeta, state.demoMode ? "Demo live" : "Live feed");
  }

  function startDemoLiveTicker() {
    if (state.liveTimer) return;

    state.demoMode = true;

    // Seed demo live matches (first 6)
    var seed = (state.demoMatches && state.demoMatches.length) ? state.demoMatches.slice(0, 6) : [];
    state.liveMatches = normalizeLiveMatches(seed);

    // give them random starting minutes
    for (var i = 0; i < state.liveMatches.length; i++) {
      state.liveMatches[i].minute = 5 + Math.floor(Math.random() * 70);
      state.liveMatches[i].score = "0 - 0";
      state.liveMatches[i].status = "LIVE";
    }

    renderLive(state.liveMatches);

    state.liveTimer = setInterval(function () {
      for (var j = 0; j < state.liveMatches.length; j++) {
        var m = state.liveMatches[j];
        if (m.status === "FT") continue;

        m.minute = (m.minute || 0) + 1;

        // minimal score simulation (rare)
        if (m.minute % 17 === 0 && Math.random() < 0.22) {
          var parts = String(m.score || "0 - 0").split("-");
          var h = parseInt(parts[0], 10) || 0;
          var a = parseInt(parts[1], 10) || 0;
          if (Math.random() < 0.55) h += 1; else a += 1;
          m.score = h + " - " + a;
        }

        if (m.minute >= 90) {
          m.status = "FT";
          m.minute = 90;
        }
      }
      renderLive(state.liveMatches);
    }, 9000);
  }

  // -----------------------------
  // Event wiring
  // -----------------------------
  function bindBus(evt, fn) {
    if (typeof window.on === "function") {
      window.on(evt, fn);
      return true;
    }
    // Fallback: DOM CustomEvent
    document.addEventListener(evt, function (e) { fn(e && e.detail); });
    return false;
  }

  function boot() {
    // initial placeholders
    if (elPicks) elPicks.innerHTML = '<div style="opacity:.75; font-size:12px; padding:8px 6px;">Select a match to generate picks.</div>';
    if (elLive) elLive.innerHTML = '<div style="opacity:.75; font-size:12px; padding:8px 6px;">Waiting for live feed.</div>';

    setMeta(elPicksMeta, "Offline");
    setMeta(elLiveMeta, "Service offline");

    bindBus("match-selected", function (match) {
      state.currentMatch = match || null;

      // Re-render picks with last odds payload if it belongs to this match
      if (state.lastOddsPayload) {
        var pid = state.lastOddsPayload.matchId || (state.lastOddsPayload && state.lastOddsPayload.id);
        if (!match || !pid || (match.id === pid || match.matchId === pid)) {
          renderTopPicks(state.lastOddsPayload);
        } else {
          renderTopPicks(null);
        }
      } else {
        renderTopPicks(null);
      }
    });

    bindBus("market-selected", function (p) {
      if (p && p.key) state.activeMarket = p.key;
      if (state.lastOddsPayload) renderTopPicks(state.lastOddsPayload);
    });

    bindBus("odds-demo:update", function (payload) {
      state.lastOddsPayload = payload || null;
      state.demoMode = true;

      // Only render if matches selection aligns OR if no selection yet
      if (!state.currentMatch || !payload || !payload.matchId || (state.currentMatch.id === payload.matchId || state.currentMatch.matchId === payload.matchId)) {
        renderTopPicks(payload);
      }
    });

    bindBus("odds-snapshot", function (payload) {
      // same as odds-demo:update for compatibility
      state.lastOddsPayload = payload || null;
      if (!state.currentMatch || !payload || !payload.matchId || (state.currentMatch.id === payload.matchId || state.currentMatch.matchId === payload.matchId)) {
        renderTopPicks(payload);
      }
    });

    bindBus("matches-loaded", function (matches) {
      state.demoMatches = Array.isArray(matches) ? matches : [];
      if (!state.liveTimer) startDemoLiveTicker();
    });

    bindBus("live-updated", function (p) {
      // Production hook
      state.demoMode = false;
      var arr = p && p.matches ? p.matches : (Array.isArray(p) ? p : []);
      state.liveMatches = normalizeLiveMatches(arr);
      renderLive(state.liveMatches);
    });

    // If something already set globals (rare)
    if (Array.isArray(window.AIML_LIVE_MATCHES) && window.AIML_LIVE_MATCHES.length) {
      state.demoMode = false;
      state.liveMatches = normalizeLiveMatches(window.AIML_LIVE_MATCHES);
      renderLive(state.liveMatches);
    }

    console.log("[right-panels] ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
