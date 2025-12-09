/* ============================================================
   AI MATCHLAB ULTRA — RIGHT PANELS ENGINE
   AI RADAR (line moves) + AI SMART MONEY (top picks)
   Για τώρα: demo δεδομένα, χωρίς πραγματικά signals
============================================================ */

function initRightPanels() {
  const radarEl = document.getElementById("panel-radar");
  const smartEl = document.getElementById("panel-smart");

  if (radarEl) {
    radarEl.innerHTML += `
      <div class="radar-item">
        Olympiakos vs PAOK · <strong>Asian line drop</strong> on home -0.75
      </div>
      <div class="radar-item">
        Barcelona vs Real Madrid · <strong>Sharp move</strong> on Over 2.5
      </div>
      <div class="radar-item">
        Bayern vs Dortmund · <strong>Home odds drift</strong>
      </div>
    `;
  }

  if (smartEl) {
    smartEl.innerHTML += `
      <div class="smart-item">
        <strong>Value Pick:</strong> AEK vs Aris — Home win @ 1.95 (model 1.75)
      </div>
      <div class="smart-item">
        <strong>Value Pick:</strong> Milan vs Napoli — Over 2.5 @ 2.05
      </div>
      <div class="smart-item">
        <strong>Value Pick:</strong> Celtic vs Rangers — BTTS @ 1.90
      </div>
    `;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRightPanels);
} else {
  initRightPanels();
}
