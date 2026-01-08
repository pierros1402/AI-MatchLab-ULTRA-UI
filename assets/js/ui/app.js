/* =========================================================
   AI MatchLab ULTRA — app.js (CLEAN / LOCKED)
   Responsibilities:
   - Global event bus
   - App lifecycle (splash)
   - Mobile title sync
   NO AI / NO ODDS / NO DEMO
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

  // ---------- MOBILE TITLE SYNC ----------
  function syncMobilePanelTitles() {
    const isRightOpen = document.body.classList.contains('drawer-right-open');
    if (!isRightOpen) return;

    const rightHeaderTitle =
      document.querySelector('aside#right-panel > .panel-header .panel-title');
    const visibleCardTitle =
      document.querySelector('aside#right-panel .right-card-header .panel-title');

    if (rightHeaderTitle && visibleCardTitle) {
      rightHeaderTitle.textContent = visibleCardTitle.textContent.trim();
    }
  }
  document.addEventListener('click', syncMobilePanelTitles, true);
})();
