/* =========================================================
   AI MatchLab ULTRA — app.js (ORIGINAL + AI BRIDGE)
========================================================= */

(function () {
  'use strict';

  if (window.__AIML_APP_INIT__) return;
  window.__AIML_APP_INIT__ = true;

  // ---------- EVENT BUS ----------
  const bus = new Map();
  window.on = function (eventName, handler) {
    if (!eventName || typeof handler !== 'function') return;
    const arr = bus.get(eventName) || [];
    arr.push(handler);
    bus.set(eventName, arr);
  };
  window.emit = function (eventName, payload) {
    const arr = bus.get(eventName);
    if (!arr || !arr.length) return;
    for (const fn of arr) {
      try { fn(payload); }
      catch (err) { console.error('[BUS] handler failed:', eventName, err); }
    }
  };

  // ---------- SPLASH HANDLER ----------
  function hideSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => {
        splash.remove();
        window.emit('app:ready');
      }, 600);
    }
  }

  window.addEventListener('load', () => {
    setTimeout(hideSplash, 1500);
  });

  // ---------- MOBILE SYNC ----------
  function syncMobilePanelTitles() {
    const isRightOpen = document.body.classList.contains('drawer-right-open');
    if (isRightOpen) {
      const rightHeaderTitle = document.querySelector('aside#right-panel > .panel-header .panel-title');
      const visibleCardTitle = document.querySelector('aside#right-panel .right-card-header .panel-title');
      if (rightHeaderTitle && visibleCardTitle) {
        rightHeaderTitle.textContent = visibleCardTitle.textContent.trim();
      }
    }
  }
  document.addEventListener('click', syncMobilePanelTitles, true);

  // =========================================================
  // 🚀 AI BRIDGE (Η ΠΡΟΣΘΗΚΗ ΠΟΥ ΧΡΕΙΑΖΟΤΑΝ)
  // =========================================================

  // 1. SCANNER ΓΙΑ ΤΟ VALUE PANEL
  window.on("today:updated", async (matches) => {
    console.log("🔍 [AI] Scanner check for:", matches?.length, "matches");
    if (!matches || !matches.length) return;
    try {
      const res = await fetch("https://ai-matchlab-brain.pierros1402.workers.dev/api/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matches: matches.slice(0, 40) })
      });
      const topPicks = await res.json();
      console.log("✅ [AI] Top Picks found:", topPicks.length);
      window.emit("ai:value-picks-ready", topPicks);
    } catch (e) {
      console.error("❌ [AI] Scanner failed:", e);
    }
  });

  // 2. BRIDGE ΓΙΑ ΤΑ ΜΕΣΑΙΑ PANELS (PREDICTIONS/STATS)
  window.on("match-selected", (m) => {
    console.log("🎯 [AI] Selected Match:", m.home, "vs", m.away);
    const dummyHub = {
      match: { teams: { home: { name: m.home }, away: { name: m.away } }, league: { name: "League" } },
      probabilities: { home: 0.45, draw: 0.25, away: 0.30 },
      ratings: { home: 80, away: 75 },
      goalStats: { expectancy: "2.80", leagueAvg: "2.5", h2hGoals: "2.9", homeGF: "1.7", awayGF: "1.2", probs: { over25: 0.65 } },
      homeForm: ["W","D","W"], awayForm: ["L","L","W"]
    };
    window.emit("hub-updated", dummyHub);
    window.emit("hub:ready", dummyHub);
  });

})();