/* /assets/js/right-panels.js
   Right column: Radar + Top Picks + Live
   Demo-first. Later you can swap loaders to Workers.
*/
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  function nowLabel() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function setMeta(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function renderList(containerId, itemsHtml, emptyText) {
    const el = $(containerId);
    if (!el) return;
    el.innerHTML = itemsHtml || `<div class="right-empty">${esc(emptyText || "No data.")}</div>`;
  }

  function cardItem({ title, sub, badge, tone }) {
    const badgeHtml = badge ? `<span class="right-badge ${tone ? "tone-" + tone : ""}">${esc(badge)}</span>` : "";
    const subHtml = sub ? `<div class="right-sub">${esc(sub)}</div>` : "";
    return `
      <div class="right-item">
        <div class="right-title">
          ${badgeHtml}
          <span class="right-title-text">${esc(title)}</span>
        </div>
        ${subHtml}
      </div>
    `;
  }

  // ---------------------------
  // DEMO DATA (replace later)
  // ---------------------------
  function demoRadar() {
    return [
      { title: "Olympiakos vs PAOK · Asian line drop on home -0.75", sub: "Signal: sharp steam · threshold ≥ 0.20", badge: "MOVE", tone: "cyan" },
      { title: "Barcelona vs Real Madrid · Sharp move on Over 2.5", sub: "Books converging · liquidity rising", badge: "O/U", tone: "cyan" },
      { title: "Bayern vs Dortmund · Home odds drift", sub: "Potential trap line · watch close", badge: "DRIFT", tone: "gray" },
    ];
  }

  function demoTopPicks() {
    return [
      { title: "Value Pick: AEK vs Aris — Home win @ 1.95", sub: "Model edge: +0.07 · Confidence: 72%", badge: "VALUE", tone: "green" },
      { title: "Value Pick: Milan vs Napoli — Over 2.5 @ 2.05", sub: "Model edge: +0.06 · Confidence: 68%", badge: "VALUE", tone: "green" },
      { title: "Value Pick: Celtic vs Rangers — BTTS @ 1.90", sub: "Model edge: +0.05 · Confidence: 66%", badge: "VALUE", tone: "green" },
    ];
  }

  function demoLive() {
    // Placeholder—until worker is wired
    return [];
  }

  // ---------------------------
  // OPTIONAL: Event bus hooks
  // ---------------------------
  function onBus(evt, fn) {
    try {
      if (typeof window.on === "function") window.on(evt, fn);
    } catch (_) {}
  }

  // ---------------------------
  // Public init
  // ---------------------------
  function refreshAll() {
    // Radar
    const radar = demoRadar().map(cardItem).join("");
    renderList("radar-list", radar, "No signals yet.");
    setMeta("radar-meta", "Updated " + nowLabel());

    // Top picks
    const picks = demoTopPicks().map(cardItem).join("");
    renderList("picks-list", picks, "No picks yet.");
    setMeta("picks-meta", "Updated " + nowLabel());

    // Live
    const live = demoLive();
    if (!live.length) {
      renderList("live-list", "", "Live service offline.");
      setMeta("live-meta", "Service offline");
    } else {
      const liveHtml = live.map(cardItem).join("");
      renderList("live-list", liveHtml, "No live matches.");
      setMeta("live-meta", "Updated " + nowLabel());
    }
  }

  function init() {
    // If right markup not present, do nothing
    if (!$("radar-list") && !$("picks-list") && !$("live-list")) return;

    refreshAll();

    // Repaint on match selection (later you’ll bind real signals)
    onBus("match-selected", function (_match) {
      // For now: just refresh timestamps so user sees it reacted
      refreshAll();
    });

    // Auto refresh demo
    setInterval(refreshAll, 20000);
    console.log("[right-panels] ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
