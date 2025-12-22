/* ============================================================
   AI MatchLab ULTRA — odds-radar.js (compat shim)
   NOTE:
   Radar rendering/click handling is owned by /assets/js/right-panels.js.
   This file exits early to prevent double-render/double-click behaviour.
============================================================ */
(function () {
  "use strict";
  // ULTRA layout: right-panels.js owns Radar (#radar-list)
  if (document.getElementById("right-panel")) return;
})();
