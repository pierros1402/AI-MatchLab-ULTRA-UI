/* =========================================================
   AI MatchLab ULTRA — app.js (MUST LOAD FIRST)
   - Global event bus: on()/emit()
   - Handles splash → UI startup
   - Initializes accordion & navigation
========================================================= */

(function () {
  'use strict';

  if (window.__AIML_APP_INIT__) return;
  window.__AIML_APP_INIT__ = true;

  // ---------- HARD GUARD ----------
  window.addEventListener('error', (e) => {
    console.error('[HARDGUARD] window.error:', e?.message || e, e?.error || '');
  });

  window.addEventListener('unhandledrejection', (e) => {
    console.error('[HARDGUARD] unhandledrejection:', e?.reason || e);
  });

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
      splash.style.transition = 'opacity 0.8s ease';
      setTimeout(() => splash.remove(), 900);
    }
  }

  // ---------- INITIALIZATION ----------
  function initApp() {
    hideSplash();

    // Initialize accordion
    if (typeof window.initAccordion === 'function') {
      window.initAccordion();
      // Open default panel "Continents"
      if (typeof window.openAccordion === 'function') {
        window.openAccordion('panel-continents');
      }
    }

    // Notify all modules that the app is ready
    window.emit('app-ready');
    console.log('[APP] Initialized');
  }

  // ---------- DOM READY ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
