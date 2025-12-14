/* =========================================================
   AI MatchLab ULTRA — accordion.js (LEFT ONLY)
   - openAccordion(panelId)
   - initAccordion()
   Single-open behavior, init-once, no double listeners
========================================================= */

(function () {
  'use strict';

  if (window.__AIML_ACCORDION_INIT__) return;
  window.__AIML_ACCORDION_INIT__ = true;

  function closeAllExcept(targetId) {
    const panels = document.querySelectorAll('#left-accordion .accordion-panel');
    const headers = document.querySelectorAll('#left-accordion .accordion-header');

    panels.forEach(p => {
      const isTarget = (p.id === targetId);
      p.classList.toggle('open', isTarget);
      p.style.display = isTarget ? 'block' : 'none';
    });

    headers.forEach(h => {
      const t = h.getAttribute('data-target');
      h.classList.toggle('active', t === targetId);
    });
  }

  window.openAccordion = function (panelId) {
    if (!panelId) return;
    const panel = document.getElementById(panelId);
    if (!panel) return console.warn('[accordion] Missing panel:', panelId);
    closeAllExcept(panelId);
  };

  window.initAccordion = function () {
    const root = document.getElementById('left-accordion');
    if (!root) return console.warn('[accordion] #left-accordion missing');

    // Event delegation: ONE handler
    root.addEventListener('click', (ev) => {
      const header = ev.target.closest('.accordion-header');
      if (!header) return;
      const target = header.getAttribute('data-target');
      if (!target) return;
      window.openAccordion(target);
    }, { passive: true });

    // Default open
    window.openAccordion('panel-continents');
  };

})();
