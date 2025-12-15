/* =========================================================
   details-modal.js (STABLE)
   - Opens modal ONLY on details-open
   - Keeps last selected match for rendering
   - Close: X / backdrop / ESC
========================================================= */

(function () {
  "use strict";
  if (window.__AIML_DETAILS_MODAL__) return;
  window.__AIML_DETAILS_MODAL__ = true;

  const modal = document.getElementById("match-details-modal");
  const closeBtn = document.getElementById("btn-details-close");
  const detailsBody = document.getElementById("panel-details");

  if (!modal || !detailsBody) return;

  let lastMatch = null;

  const esc = (s) =>
    String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  function openModal() {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  function render(match) {
    if (!match || !match.id) {
      detailsBody.innerHTML = `Select a match to view details.`;
      return;
    }

    const home = esc(match.home || match.homeName || "Home");
    const away = esc(match.away || match.awayName || "Away");
    const league = esc(match.leagueName || match.league || "");
    const ko = esc(match.kickoff || match.displayTime || "");

    detailsBody.innerHTML = `
      <div style="display:grid;gap:10px;">
        <div style="font-weight:900;font-size:16px;">${home} vs ${away}</div>
        <div style="opacity:.8;">${league}${league && ko ? " • " : ""}${ko}</div>
        <div style="opacity:.7;">(Demo details panel)</div>
      </div>
    `;
  }

  function onDetailsOpen(match) {
    lastMatch = match || lastMatch;
    render(lastMatch);
    openModal();
  }

  function onMatchSelected(match) {
    // update last selected but DO NOT open modal
    lastMatch = match || lastMatch;
    if (!modal.classList.contains("hidden")) render(lastMatch);
  }

  // Close handlers
  if (closeBtn) closeBtn.addEventListener("click", (e) => { e.preventDefault(); closeModal(); });
  modal.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.getAttribute && t.getAttribute("data-close") === "1") closeModal();
    if (t && t.classList && t.classList.contains("modal-backdrop")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // Bus listeners
  function busOn(name, fn) {
    if (typeof window.on === "function") window.on(name, fn);
    else document.addEventListener(name, (e) => fn(e?.detail));
  }

  busOn("details-open", onDetailsOpen);
  busOn("details:open", onDetailsOpen);
  busOn("match-details", onDetailsOpen);

  busOn("match-selected-normalized", onMatchSelected);
  busOn("match-selected", onMatchSelected);

})();
