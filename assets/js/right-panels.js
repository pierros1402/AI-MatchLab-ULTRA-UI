/* ============================================================
   AI MatchLab ULTRA — assets/js/right-panels.js
   Right column cards (single stack):
     1) AI Radar (handled by odds-radar.js)
     2) AI Smart Money · Top Picks (AI/Stats — rendered here)
     3) AI Value Picks (AI vs Market — rendered by value-picks.js)
     4) Live Matches (demo ticker)

   This file ensures the "AI Value Picks" CARD exists between Top Picks and Live
   using the SAME markup/classes as the other right cards in index.html:
     section.right-card > header.right-card-header > .panel-title + .right-meta
     + div.right-card-body > div.right-list

   Requires global event bus: on()/emit() from app.js
============================================================ */

(function () {
  "use strict";
  if (window.__AIML_RIGHT_PANELS_V5__) return;
  window.__AIML_RIGHT_PANELS_V5__ = true;

  // Existing anchors from index.html
  var elPicksList = document.getElementById("picks-list");
  var elPicksMeta = document.getElementById("picks-meta");
  var elLiveList  = document.getElementById("live-list");
  var elLiveMeta  = document.getElementById("live-meta");

  var state = {
    currentMatch: null,
    currentMatchId: null,
    lastPicksPayload: null,
    demoMatches: [],
    liveTimer: null
  };

  // -----------------------------
  // Utilities
  // -----------------------------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setText(el, txt) {
    if (!el) return;
    el.textContent = txt == null ? "" : String(txt);
  }

  function badge(text, tone) {
    // Leverage existing badge style if present; fall back to simple
    var cls = "right-badge " + (tone || "tone-gray");
    return '<span class="' + cls + '">' + esc(text) + "</span>";
  }

  function ensureScriptOnce(id, src) {
    if (document.getElementById(id)) return;
    var s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.defer = true;
    document.head.appendChild(s);
  }

  function bindBus(name, fn) {
    if (typeof window.on === "function") window.on(name, fn);
    else document.addEventListener(name, function (e) { fn(e && e.detail); });
  }

  function getMatchId(m) {
    return m ? (m.id || m.matchId || m.fixtureId || m.gameId) : null;
  }

  // -----------------------------
  // Ensure AI Value Picks card exists and matches other cards' markup
  // -----------------------------
  function ensureValueCard() {
    if (document.getElementById("card-value-picks")) return true;

    var topCard = document.getElementById("card-top-picks");
    var liveCard = document.getElementById("card-live");
    var parent = null;

    if (liveCard && liveCard.parentNode) parent = liveCard.parentNode;
    else if (topCard && topCard.parentNode) parent = topCard.parentNode;
    if (!parent) return false;

    var sec = document.createElement("section");
    sec.className = "right-card";
    sec.id = "card-value-picks";
    sec.innerHTML = `
      <header class="right-card-header">
        <div class="panel-title">AI Value Picks</div>
        <div class="right-meta" id="value-picks-meta">AI vs Market</div>
      </header>
      <div class="right-card-body" id="panel-value-picks">
        <div class="right-list" id="value-picks-list">
          <div class="muted">Select a match to see AI Value Picks.</div>
        </div>
      </div>
    `;

    // Insert between Top Picks and Live if possible
    if (liveCard && liveCard.parentNode) {
      liveCard.parentNode.insertBefore(sec, liveCard);
      return true;
    }
    // else append after Top Picks
    if (topCard && topCard.parentNode) {
      if (topCard.nextSibling) topCard.parentNode.insertBefore(sec, topCard.nextSibling);
      else topCard.parentNode.appendChild(sec);
      return true;
    }

    parent.appendChild(sec);
    return true;
  }

  // -----------------------------
  // Top Picks rendering (AI/Stats)
  // Expects payload: { matchId, picks:[{title,score,rationale,tags}] }
  // -----------------------------
  function renderTopPicks(payload) {
    if (!elPicksList) elPicksList = document.getElementById("picks-list");
    if (!elPicksList) return;

    var match = state.currentMatch;
    var matchId = state.currentMatchId;

    if (payload && matchId && payload.matchId && String(payload.matchId) !== String(matchId)) return;

    var picks = payload && Array.isArray(payload.picks) ? payload.picks : [];

    if (!match) {
      elPicksList.innerHTML = '<div class="muted">Select a match to see Top Picks.</div>';
      setText(elPicksMeta, "AI/Stats");
      return;
    }

    if (!payload) {
      elPicksList.innerHTML = '<div class="muted">Waiting for <b>top-picks:update</b> (AI/Stats engine).</div>';
      setText(elPicksMeta, "AI/Stats · Offline");
      return;
    }

    if (!picks.length) {
      elPicksList.innerHTML = '<div class="muted">No picks available for this match.</div>';
      setText(elPicksMeta, "AI/Stats");
      return;
    }

    var title = esc(match.home || "Home") + " vs " + esc(match.away || "Away");
    var html = '';
    html += '<div class="right-item" style="border-bottom:1px solid rgba(255,255,255,.10);padding-bottom:10px;margin-bottom:10px;">';
    html += '  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">';
    html += '    <div style="font-weight:950;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + title + '</div>';
    html += '    <div class="right-meta" style="opacity:.72;">AI/Stats</div>';
    html += '  </div>';
    html += '</div>';

    for (var i = 0; i < picks.length; i++) {
      var p = picks[i] || {};
      var t = p.title || p.pick || p.name || ("Pick " + (i + 1));
      var score = (p.score != null && isFinite(Number(p.score))) ? Number(p.score) : null;
      var rationale = p.rationale || p.reason || p.notes || "";
      var tags = Array.isArray(p.tags) ? p.tags : [];

      html += '<div class="right-item">';
      html += '  <div style="display:flex;align-items:center;gap:10px;">';
      html += '    <div style="font-weight:950;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(t) + '</div>';
      if (score != null) html += '    <div style="margin-left:auto;">' + badge("Score " + score, "tone-green") + '</div>';
      html += "  </div>";

      if (rationale) html += '  <div class="right-sub">' + esc(rationale) + "</div>";
      if (tags.length) {
        html += '  <div class="right-sub" style="opacity:.9;margin-top:6px;">' +
          tags.map(function (x) { return '<span class="right-badge tone-gray" style="margin-right:6px;">' + esc(x) + '</span>'; }).join("") +
          "</div>";
      }
      html += "</div>";
    }

    elPicksList.innerHTML = html;
    setText(elPicksMeta, "AI/Stats · " + picks.length + " picks");
  }

  function clearTopPicks() {
    state.lastPicksPayload = null;
    renderTopPicks(null);
  }

  // -----------------------------
  // Live (demo ticker)
  // -----------------------------
  function normalizeLiveMatches(matches) {
    if (!Array.isArray(matches)) return [];
    return matches.slice(0, 16).map(function (m) {
      return {
        id: m.id || m.matchId,
        home: m.home || m.homeName || "Home",
        away: m.away || m.awayName || "Away",
        minute: m.minute || 0,
        score: m.score || "0 - 0"
      };
    });
  }

  function renderLive(list) {
    if (!elLiveList) elLiveList = document.getElementById("live-list");
    if (!elLiveList) return;

    if (!list || !list.length) {
      elLiveList.innerHTML = '<div class="muted">No live feed (demo).</div>';
      setText(elLiveMeta, "Service offline");
      return;
    }

    var html = "";
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      html += '<div class="right-item">';
      html += '  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">';
      html += '    <div style="min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(m.home) + " vs " + esc(m.away) + "</div>";
      html += '    <span class="right-badge tone-cyan">LIVE</span>';
      html += "  </div>";
      html += '  <div class="right-sub">' + esc(m.score) + " • " + esc(m.minute) + "'</div>";
      html += "</div>";
    }

    elLiveList.innerHTML = html;
    setText(elLiveMeta, "Demo ticker");
  }

  function startDemoLiveTicker() {
    if (state.liveTimer) return;
    state.liveTimer = setInterval(function () {
      if (!state.demoMatches || !state.demoMatches.length) return;
      var list = normalizeLiveMatches(state.demoMatches).map(function (m, idx) {
        var minute = ((Date.now() / 1000) | 0) % 90;
        var scoreA = (minute > 60 ? 1 : 0) + (idx % 3 === 0 && minute > 70 ? 1 : 0);
        var scoreB = (minute > 75 ? 1 : 0) + (idx % 5 === 0 && minute > 80 ? 1 : 0);
        m.minute = minute;
        m.score = scoreA + " - " + scoreB;
        return m;
      });
      renderLive(list);
    }, 2000);
  }

  // -----------------------------
  // Boot
  // -----------------------------
  function boot() {
    // Ensure AI Value Picks card exists (uniform header/frame)
    ensureValueCard();

    // Ensure engines are available (classic scripts)
    ensureScriptOnce("aiml-top-picks-engine", "/assets/js/ui/top-picks.js");
    ensureScriptOnce("aiml-value-picks-engine", "/assets/js/ui/value-picks.js");

    // Initial render
    renderTopPicks(null);
    renderLive(null);

    // Selection
    function onSelect(match) {
      state.currentMatch = match || null;
      state.currentMatchId = getMatchId(match);

      clearTopPicks();

      if (typeof window.emit === "function") {
        window.emit("top-picks:request", { match: state.currentMatch });
      }
    }

    bindBus("match-selected", onSelect);
    bindBus("match-selected-normalized", onSelect);

    bindBus("top-picks:update", function (payload) {
      state.lastPicksPayload = payload || null;
      renderTopPicks(state.lastPicksPayload);
    });

    bindBus("top-picks:clear", function () {
      clearTopPicks();
    });

    bindBus("matches-loaded", function (matches) {
      state.demoMatches = Array.isArray(matches) ? matches : [];
      if (!state.liveTimer) startDemoLiveTicker();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
/* =========================================================
   DEMO INJECT v2 (safe): populate + animate right panels
   - Fills: radar-list, picks-list, deviations-list, value-picks-list, live-list
   - Runs only if lists are empty / show "offline/select/no" placeholders
   - Updates every 8s to simulate live movement
========================================================= */
(function () {
  "use strict";

  if (window.__AIML_RIGHT_DEMO_INJECT_V2__) return;
  window.__AIML_RIGHT_DEMO_INJECT_V2__ = true;

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function looksPlaceholder(el) {
    if (!el) return true;
    const txt = (el.textContent || "").trim().toLowerCase();
    const hasChildren = el.children && el.children.length > 0;
    if (hasChildren) return false;
    if (!txt) return true;
    return (
      txt.includes("select a match") ||
      txt.includes("no ") ||
      txt.includes("offline") ||
      txt.includes("service offline") ||
      txt.includes("no live feed")
    );
  }

  function item(title, sub) {
    return `
      <div class="right-item">
        <div><strong>${esc(title)}</strong></div>
        <div style="opacity:.82;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${esc(sub)}
        </div>
      </div>
    `;
  }

  // --- Demo state (mutates over time) ------------------------------------
  const state = {
    radar: [
      { m: "Olympiacos vs AEK", d: 0.25, mk: "1X2", b: "Stoiximan" },
      { m: "PAOK vs Aris", d: -0.22, mk: "O/U 2.5", b: "Bet365" },
      { m: "Panathinaikos vs Volos", d: 0.31, mk: "Asian +0.25", b: "OPAP" },
      { m: "Atromitos vs OFI", d: 0.18, mk: "1X2", b: "Novibet" },
      { m: "Lamia vs Asteras", d: 0.27, mk: "BTTS", b: "Betshop" }
    ],
    picks: [
      { m: "Arsenal vs Chelsea", d: 0.42, note: "AI edge +4.2%", src: "EU" },
      { m: "Inter vs Napoli", d: 0.35, note: "Steam move", src: "Betfair" },
      { m: "Barcelona vs Sevilla", d: 0.31, note: "Sharp drift", src: "Greek" },
      { m: "PSG vs Lyon", d: 0.29, note: "Reversal", src: "EU" },
      { m: "Real Madrid vs Girona", d: 0.33, note: "Totals dev", src: "EU" }
    ],
    deviations: [
      { m: "Liverpool vs City", d: 0.40, mk: "1X2" },
      { m: "Real Madrid vs Girona", d: 0.33, mk: "O/U 2.5" },
      { m: "PSG vs Lyon", d: 0.29, mk: "Asian +0.5" },
      { m: "Ajax vs AZ", d: 0.25, mk: "BTTS" },
      { m: "Porto vs Braga", d: 0.23, mk: "1X2" }
    ],
    value: [
      { m: "Bayern vs Dortmund", edge: 6.2, mk: "1X2", note: "Mispriced drift" },
      { m: "Inter vs Napoli", edge: 5.6, mk: "O/U 2.5", note: "Overreaction" },
      { m: "AEK vs Olympiacos", edge: 7.1, mk: "Asian +0.25", note: "Line move lag" },
      { m: "Barcelona vs Sevilla", edge: 5.3, mk: "BTTS", note: "Market split" }
    ],
    live: [
      { m: "Aris vs PAOK", min: 57, sc: "1–1", st: "Live" },
      { m: "AEK vs Olympiacos", min: 45, sc: "2–0", st: "HT" },
      { m: "Atromitos vs Panserraikos", min: 74, sc: "0–0", st: "Live" },
      { m: "Panetolikos vs Lamia", min: 28, sc: "1–0", st: "1H" },
      { m: "OFI vs Volos", min: 89, sc: "2–2", st: "Live" }
    ]
  };

  function fmtDelta(x) {
    const sign = x >= 0 ? "+" : "";
    return sign + x.toFixed(2);
  }

  function renderAll(force) {
    const radarEl = $("radar-list");
    const picksEl = $("picks-list");
    const devEl = $("deviations-list");
    const valueEl = $("value-picks-list");   // IMPORTANT: your id
    const liveEl = $("live-list");

    if (force || looksPlaceholder(radarEl)) {
      radarEl && (radarEl.innerHTML = state.radar
        .map(r => item(r.m, `${r.mk} · ${r.b} · Δ ${fmtDelta(r.d)}`)).join(""));
    }

    if (force || looksPlaceholder(picksEl)) {
      picksEl && (picksEl.innerHTML = state.picks
        .map(p => item(p.m, `${p.note} · ${p.src} · Δ ${fmtDelta(p.d)}`)).join(""));
    }

    if (force || looksPlaceholder(devEl)) {
      devEl && (devEl.innerHTML = state.deviations
        .map(d => item(d.m, `${d.mk} · Δ ${fmtDelta(d.d)}`)).join(""));
    }

    // Value Picks demo (so the card is not empty)
    if (force || looksPlaceholder(valueEl)) {
      valueEl && (valueEl.innerHTML = state.value
        .map(v => item(v.m, `${v.mk} · Edge ${v.edge.toFixed(1)}% · ${v.note}`)).join(""));
    }

    if (force || looksPlaceholder(liveEl)) {
      liveEl && (liveEl.innerHTML = state.live
        .map(l => item(l.m, `${l.st} · ${l.min}' · ${l.sc}`)).join(""));
    }
  }

  function tick() {
    // mutate a couple deltas to simulate live movement
    function jitter() { return (Math.random() * 0.10 - 0.05); } // ±0.05
    const r = state.radar[Math.floor(Math.random() * state.radar.length)];
    r.d = Math.max(-0.60, Math.min(0.60, r.d + jitter()));

    const p = state.picks[Math.floor(Math.random() * state.picks.length)];
    p.d = Math.max(0.10, Math.min(0.80, p.d + jitter()));

    const d = state.deviations[Math.floor(Math.random() * state.deviations.length)];
    d.d = Math.max(0.15, Math.min(0.70, d.d + jitter()));

    // live minutes advance
    state.live.forEach(l => { if (l.st !== "FT") l.min = Math.min(90, l.min + (Math.random() < 0.35 ? 1 : 0)); });

    // occasionally rotate one item for freshness
    if (Math.random() < 0.30) state.radar.push(state.radar.shift());
    if (Math.random() < 0.25) state.picks.push(state.picks.shift());
    if (Math.random() < 0.20) state.deviations.push(state.deviations.shift());

    renderAll(true);
  }

  function init() {
    renderAll(false);

    // refresh after match selection too (in case other code overwrites placeholders)
    if (typeof window.on === "function") {
      window.on("match-selected", function () { setTimeout(() => renderAll(false), 60); });
    }

    // start demo ticker
    setInterval(tick, 8000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

})();
