/* ============================================================
   AI MatchLab ULTRA — ui/value-picks.js  (AI Value Picks)
   - Compares model probabilities (Hub) vs market implied (Odds snapshot)
   - Renders into:
       • #value-picks-list
       • #value-picks-meta
   - Listens:
       • "match-selected" / "match-selected-normalized"
       • "hub-updated" / "hub:updated" / "match-hub:update"  (model probabilities)
       • "odds-snapshot" / "odds-demo:update"                (market odds current)
   - This module is isolated from AI Top Picks (stats-only).
============================================================ */

(function () {
  "use strict";
  if (window.__AIML_AI_VALUE_PICKS_V1__) return;
  window.__AIML_AI_VALUE_PICKS_V1__ = true;

  var activeMatchId = null;
  var activeMatch = null;

  var modelByMatch = Object.create(null); // matchId -> {home,draw,away}
  var oddsByMatch = Object.create(null);  // matchId -> snapshot payload

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function num(x) {
    var n = Number(x);
    return isFinite(n) ? n : null;
  }

  function getMatchId(m) {
    return m ? (m.id || m.matchId || m.fixtureId || m.gameId) : null;
  }

  function setMeta(text) {
    var meta = $("value-picks-meta");
    if (meta) meta.textContent = text;
  }

  function setBody(html) {
    var body = $("value-picks-list");
    if (body) body.innerHTML = html;
  }

  function bestEffortExtractProbs(hub) {
    var p = null;

    if (hub && hub.prediction && hub.prediction.probabilities) p = hub.prediction.probabilities;
    if (!p && hub && hub.prediction && hub.prediction.probs) p = hub.prediction.probs;
    if (!p && hub && hub.model && hub.model.probabilities) p = hub.model.probabilities;
    if (!p && hub && hub.ai && hub.ai.probabilities) p = hub.ai.probabilities;

    if (p) {
      var home = num(p.home ?? p.h ?? p.H ?? p["1"]);
      var draw = num(p.draw ?? p.d ?? p.D ?? p["X"]);
      var away = num(p.away ?? p.a ?? p.A ?? p["2"]);
      if (home != null || draw != null || away != null) {
        if (home != null && home > 1) home /= 100;
        if (draw != null && draw > 1) draw /= 100;
        if (away != null && away > 1) away /= 100;
        return { home: home, draw: draw, away: away };
      }
    }
    return null;
  }

  function impliedFromOdds(o1, ox, o2) {
    var a = num(o1), b = num(ox), c = num(o2);
    if (!a || !b || !c) return null;
    if (a <= 1.01 || b <= 1.01 || c <= 1.01) return null;
    var ia = 1 / a, ib = 1 / b, ic = 1 / c;
    var s = ia + ib + ic;
    if (!s) return null;
    return { home: ia / s, draw: ib / s, away: ic / s };
  }

  function getCurrentOddsFromSnapshot(snapshot, providerKey) {
    // Expected snapshot.providers[providerKey].markets["1X2"]["1"].current
    try {
      var mk = snapshot.providers && snapshot.providers[providerKey] && snapshot.providers[providerKey].markets;
      if (!mk) return null;
      var m = mk["1X2"] || mk["h2h"] || null;
      if (!m) return null;

      function cv(sel) {
        var cell = m[sel];
        if (!cell) return null;
        return num(cell.current != null ? cell.current : cell.cur);
      }

      var o1 = cv("1"), ox = cv("X"), o2 = cv("2");
      if (o1 == null || ox == null || o2 == null) return null;
      return { o1: o1, ox: ox, o2: o2 };
    } catch (e) {
      return null;
    }
  }

  function buildValuePicks(matchId) {
    var model = modelByMatch[String(matchId)] || null;
    var snapshot = oddsByMatch[String(matchId)] || null;

    if (!model || !snapshot || !snapshot.providers) return [];

    var providerKeys = Object.keys(snapshot.providers);
    var out = [];

    for (var i = 0; i < providerKeys.length; i++) {
      var pk = providerKeys[i];
      var odds = getCurrentOddsFromSnapshot(snapshot, pk);
      if (!odds) continue;

      var imp = impliedFromOdds(odds.o1, odds.ox, odds.o2);
      if (!imp) continue;

      var candidates = [
        { k: "1", label: "Home Win", mp: model.home, ip: imp.home, odd: odds.o1 },
        { k: "X", label: "Draw",     mp: model.draw, ip: imp.draw, odd: odds.ox },
        { k: "2", label: "Away Win", mp: model.away, ip: imp.away, odd: odds.o2 }
      ];

      for (var j = 0; j < candidates.length; j++) {
        var c = candidates[j];
        if (c.mp == null || c.ip == null) continue;
        var edge = c.mp - c.ip; // positive = value
        if (edge >= 0.05) {
          out.push({
            provider: pk.toUpperCase(),
            selection: c.k,
            title: c.label,
            edge: edge,
            mp: c.mp,
            ip: c.ip,
            odd: c.odd
          });
        }
      }
    }

    out.sort(function (a, b) { return (b.edge || 0) - (a.edge || 0); });
    return out.slice(0, 6);
  }

  function fmtPct(p) {
    var n = num(p);
    if (n == null) return "—";
    return Math.round(n * 100) + "%";
  }

  function fmtOdd(o) {
    var n = num(o);
    if (n == null) return "—";
    return n.toFixed(2);
  }

  function render() {
    if (!activeMatchId) {
      setBody('<div class="right-empty">Select a match to see AI Value Picks.</div>');
      setMeta("AI vs Market");
      return;
    }

    var picks = buildValuePicks(activeMatchId);

    if (!picks.length) {
      setBody('<div class="right-empty">No value edges ≥ 5% detected (AI vs Market).</div>');
      setMeta("AI vs Market · 0");
      return;
    }

    var html = "";
    for (var i = 0; i < picks.length; i++) {
      var p = picks[i];
      var edgePct = Math.round(p.edge * 100);

      html += '<div class="right-item">';
      html += '  <div class="right-title">';
      html += '    <div class="right-title-text">' + esc(p.title) + ' <span style="opacity:.78;">(' + esc(p.provider) + ')</span></div>';
      html += '    <div style="margin-left:auto;"><span class="right-badge tone-green">+' + edgePct + '%</span></div>';
      html += '  </div>';
      html += '  <div class="right-sub">Model ' + fmtPct(p.mp) + ' vs Implied ' + fmtPct(p.ip) + ' • Odd ' + fmtOdd(p.odd) + ' • Sel ' + esc(p.selection) + '</div>';
      html += "</div>";
    }

    setBody(html);
    setMeta("AI vs Market · " + picks.length);
  }

  function bindBus(name, fn) {
    if (typeof window.on === "function") window.on(name, fn);
    else document.addEventListener(name, function (e) { fn(e && e.detail); });
  }

  function boot() {
    // Wait until right-panels has injected containers (best-effort)
    if (!$("value-picks-list")) {
      // try a few times
      var tries = 0;
      var t = setInterval(function () {
        tries++;
        if ($("value-picks-list") || tries > 20) {
          clearInterval(t);
          render();
        }
      }, 250);
    }

    bindBus("match-selected", function (m) {
      activeMatch = m || null;
      activeMatchId = getMatchId(m);
      render();
    });

    bindBus("match-selected-normalized", function (m) {
      activeMatch = m || null;
      activeMatchId = getMatchId(m);
      render();
    });

    function onHub(hub) {
      // try to associate with match id if possible
      var mid = getMatchId(hub && (hub.match || hub.fixture || hub)) || getMatchId(hub && hub.match);
      var probs = bestEffortExtractProbs(hub);
      if (mid && probs) modelByMatch[String(mid)] = probs;

      // update if this is the active match or if no explicit mid
      if (activeMatchId && probs) {
        if (!mid || String(mid) === String(activeMatchId)) {
          modelByMatch[String(activeMatchId)] = probs;
          render();
        }
      }
    }

    bindBus("hub-updated", onHub);
    bindBus("hub:updated", onHub);
    bindBus("match-hub:update", onHub);

    function onOdds(snapshot) {
      var mid = snapshot && (snapshot.matchId || snapshot.id);
      if (!mid) return;
      oddsByMatch[String(mid)] = snapshot;
      if (activeMatchId && String(mid) === String(activeMatchId)) render();
    }

    bindBus("odds-snapshot", onOdds);
    bindBus("odds-demo:update", onOdds);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
