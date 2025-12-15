/* ============================================================
   AI MatchLab ULTRA — ui/top-picks.js  (AI/Stats-only)
   - Produces "top-picks:update" payloads for Right Panels
   - DOES NOT use odds. It only uses Hub/Stats payloads if available.
   - Listens:
       • "top-picks:request" { match }
       • "hub-updated" / "hub:updated" / "match-hub:update" (best-effort)
       • "match-selected" (fallback trigger)
   - Emits:
       • "top-picks:update" { matchId, picks:[{title,score,rationale,tags}] }
============================================================ */

(function () {
  "use strict";
  if (window.__AIML_AI_TOP_PICKS_V1__) return;
  window.__AIML_AI_TOP_PICKS_V1__ = true;

  var lastHub = null; // latest hub payload (any match)
  var lastHubByMatch = Object.create(null); // matchId -> hub
  var activeMatch = null;

  function getMatchId(m) {
    return m ? (m.id || m.matchId || m.fixtureId || m.gameId) : null;
  }

  function num(x) {
    var n = Number(x);
    return isFinite(n) ? n : null;
  }

  function clamp(x, a, b) {
    return Math.max(a, Math.min(b, x));
  }

  function pickTitle(outcome) {
    if (outcome === "H") return "Home Win";
    if (outcome === "D") return "Draw";
    if (outcome === "A") return "Away Win";
    return outcome;
  }

  function bestEffortExtractProbs(hub) {
    // Try common shapes
    var p = null;

    if (hub && hub.prediction && hub.prediction.probabilities) p = hub.prediction.probabilities;
    if (!p && hub && hub.prediction && hub.prediction.probs) p = hub.prediction.probs;
    if (!p && hub && hub.model && hub.model.probabilities) p = hub.model.probabilities;
    if (!p && hub && hub.ai && hub.ai.probabilities) p = hub.ai.probabilities;

    // Normalize to {home,draw,away} if possible
    if (p) {
      var home = num(p.home ?? p.h ?? p.H ?? p["1"]);
      var draw = num(p.draw ?? p.d ?? p.D ?? p["X"]);
      var away = num(p.away ?? p.a ?? p.A ?? p["2"]);
      if (home != null || draw != null || away != null) {
        // if in 0..1 keep, else assume 0..100
        if (home != null && home > 1) home /= 100;
        if (draw != null && draw > 1) draw /= 100;
        if (away != null && away > 1) away /= 100;
        return { home: home, draw: draw, away: away };
      }
    }
    return null;
  }

  function bestEffortExpectedGoals(hub) {
    // common keys: xg_total, expected_goals, goalsExp, etc
    var g = null;
    if (hub && hub.goals && hub.goals.expected_total != null) g = num(hub.goals.expected_total);
    if (g == null && hub && hub.prediction && hub.prediction.expected_goals_total != null) g = num(hub.prediction.expected_goals_total);
    if (g == null && hub && hub.model && hub.model.expected_goals_total != null) g = num(hub.model.expected_goals_total);
    if (g == null && hub && hub.xg && hub.xg.total != null) g = num(hub.xg.total);
    return g;
  }

  function bestEffortBTTS(hub) {
    // common keys: btts_yes, bttsYes, etc
    var p = null;
    if (hub && hub.goals && hub.goals.btts_yes != null) p = num(hub.goals.btts_yes);
    if (p == null && hub && hub.prediction && hub.prediction.btts_yes != null) p = num(hub.prediction.btts_yes);
    if (p == null && hub && hub.model && hub.model.btts_yes != null) p = num(hub.model.btts_yes);
    if (p != null && p > 1) p /= 100;
    return p;
  }

  function buildPicks(match, hub) {
    var picks = [];
    var probs = bestEffortExtractProbs(hub);
    var eg = bestEffortExpectedGoals(hub);
    var btts = bestEffortBTTS(hub);

    // 1) 1X2 strongest lean
    if (probs) {
      var h = probs.home, d = probs.draw, a = probs.away;
      var best = { k: "H", v: h ?? -1 };
      if (d != null && d > best.v) best = { k: "D", v: d };
      if (a != null && a > best.v) best = { k: "A", v: a };

      if (best.v != null && best.v > 0.42) {
        picks.push({
          title: pickTitle(best.k),
          score: Math.round(clamp(best.v, 0, 1) * 100),
          rationale: "Model probability lead on 1X2.",
          tags: ["AI", "1X2"]
        });
      }
    }

    // 2) Goals inclination (O/U 2.5)
    if (eg != null) {
      var over = eg >= 2.65;
      var under = eg <= 2.35;
      if (over || under) {
        picks.push({
          title: over ? "Over 2.5 Goals" : "Under 2.5 Goals",
          score: Math.round(clamp(Math.abs(eg - 2.5) / 1.2, 0, 1) * 100),
          rationale: "Expected total goals suggests a clear lean.",
          tags: ["AI", "Goals"]
        });
      }
    }

    // 3) BTTS lean
    if (btts != null) {
      if (btts >= 0.58 || btts <= 0.42) {
        var yes = btts >= 0.58;
        picks.push({
          title: yes ? "BTTS — Yes" : "BTTS — No",
          score: Math.round(clamp(yes ? btts : (1 - btts), 0, 1) * 100),
          rationale: "Both-teams-to-score probability is decisive.",
          tags: ["AI", "BTTS"]
        });
      }
    }

    // fallback (no hub info)
    if (!picks.length) {
      picks.push({
        title: "AI Top Picks",
        score: 0,
        rationale: "Waiting for match hub / stats payload.",
        tags: ["AI", "Offline"]
      });
    }

    // Keep up to 5
    return picks.slice(0, 5);
  }

  function emitUpdate(matchId, picks) {
    if (typeof window.emit === "function") {
      window.emit("top-picks:update", { matchId: matchId, picks: picks });
    } else {
      try {
        document.dispatchEvent(new CustomEvent("top-picks:update", { detail: { matchId: matchId, picks: picks } }));
      } catch (e) {}
    }
  }

  function tryUpdateFor(match) {
    var matchId = getMatchId(match);
    if (!matchId) return;

    var hub = lastHubByMatch[String(matchId)] || lastHub || null;
    var picks = buildPicks(match, hub);
    emitUpdate(matchId, picks);
  }

  function bindBus(name, fn) {
    if (typeof window.on === "function") window.on(name, fn);
    else document.addEventListener(name, function (e) { fn(e && e.detail); });
  }

  function boot() {
    // request triggers
    bindBus("top-picks:request", function (p) {
      activeMatch = p && p.match ? p.match : activeMatch;
      tryUpdateFor(activeMatch);
    });

    bindBus("match-selected", function (m) {
      activeMatch = m || activeMatch;
      tryUpdateFor(activeMatch);
    });

    bindBus("match-selected-normalized", function (m) {
      activeMatch = m || activeMatch;
      tryUpdateFor(activeMatch);
    });

    // hub updates (best-effort names)
    function onHub(hub) {
      lastHub = hub || lastHub;
      // if hub includes match id, cache it
      var mid = getMatchId(hub && (hub.match || hub.fixture || hub)) || getMatchId(hub && hub.match);
      if (mid) lastHubByMatch[String(mid)] = hub;

      // update current match if relevant
      if (activeMatch) {
        var activeId = getMatchId(activeMatch);
        if (!mid || !activeId || String(mid) === String(activeId)) {
          tryUpdateFor(activeMatch);
        }
      }
    }

    bindBus("hub-updated", onHub);
    bindBus("hub:updated", onHub);
    bindBus("match-hub:update", onHub);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
