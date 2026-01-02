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

  /* =====================================================
     MOBILE PANEL TITLE SYNC (SAFE, NON-INTRUSIVE)
     - Fills panel-header .panel-title ONLY on mobile drawers
     - Does NOT affect desktop
     - Does NOT change logic or flow
  ===================================================== */

  function syncMobilePanelTitles() {
    const isLeftOpen  = document.body.classList.contains('drawer-left-open');
    const isRightOpen = document.body.classList.contains('drawer-right-open');
    if (!isLeftOpen && !isRightOpen) return;

    // LEFT PANEL: keep existing title (Navigation) if present
    if (isLeftOpen) {
      const leftHeaderTitle = document.querySelector(
        'aside#left-panel .panel-header .panel-title'
      );
      if (leftHeaderTitle && !leftHeaderTitle.textContent.trim()) {
        leftHeaderTitle.textContent = 'Navigation';
      }
    }

    // RIGHT PANEL: sync with first visible right-card header title
    if (isRightOpen) {
      const rightHeaderTitle = document.querySelector(
        'aside#right-panel > .panel-header .panel-title'
      );
      if (!rightHeaderTitle) return;

      const visibleCardTitle = Array.from(
        document.querySelectorAll(
          'aside#right-panel .right-card-header .panel-title'
        )
      ).find(el => {
        const card = el.closest('.right-card');
        return card && card.offsetParent !== null;
      });

      if (visibleCardTitle) {
        const txt = visibleCardTitle.textContent.trim();
        if (txt && rightHeaderTitle.textContent.trim() !== txt) {
          rightHeaderTitle.textContent = txt;
        }
      }
    }
  }

  // Run sync on drawer-related interactions (no polling)
  document.addEventListener('click', syncMobilePanelTitles, true);
  document.addEventListener('touchstart', syncMobilePanelTitles, true);

})();
