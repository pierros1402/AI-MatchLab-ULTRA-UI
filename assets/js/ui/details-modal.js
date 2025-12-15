/* assets/js/ui/details-modal.js (STABLE)
   - Opens ONLY on details-open
   - Keeps last selected match for rendering
   - Close: X / backdrop / ESC
*/
(function () {
  "use strict";
  if (window.__AIML_DETAILS_MODAL__) return;
  window.__AIML_DETAILS_MODAL__ = true;

  var modal = document.getElementById("match-details-modal") || document.getElementById("details-modal");
  var closeBtn = document.getElementById("btn-details-close");
  var detailsBody = document.getElementById("panel-details");

  if (!modal || !detailsBody) return;

  var lastMatch = null;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function isOpen() {
    return !modal.classList.contains("hidden") || modal.getAttribute("aria-hidden") === "false";
  }

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
      detailsBody.innerHTML = "Select a match to view details.";
      return;
    }

    var home = esc(match.home || match.homeName || "Home");
    var away = esc(match.away || match.awayName || "Away");
    var league = esc(match.leagueName || match.league || "");
    var ko = esc(match.kickoff || match.displayTime || "");

    detailsBody.innerHTML =
      '<div style="display:grid;gap:10px;">' +
        '<div style="font-weight:900;font-size:16px;">' + home + " vs " + away + "</div>" +
        '<div style="opacity:.8;">' + league + (league && ko ? " • " : "") + ko + "</div>" +
        '<div style="opacity:.7;">(Demo details panel)</div>' +
      "</div>";
  }

  function onDetailsOpen(match) {
    lastMatch = match || lastMatch;
    render(lastMatch);
    openModal();
  }

  function onMatchSelected(match) {
    // update last selected but DO NOT open modal
    lastMatch = match || lastMatch;
    if (isOpen()) render(lastMatch);
  }

  // Close handlers
  if (closeBtn) {
    closeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      closeModal();
    });
  }

  modal.addEventListener("click", function (e) {
    var t = e.target;
    if (!t) return;
    if (t.getAttribute && t.getAttribute("data-close") === "1") closeModal();
    if (t.classList && t.classList.contains("modal-backdrop")) closeModal();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });

  // Bus listeners
  function busOn(name, fn) {
    if (typeof window.on === "function") window.on(name, fn);
    else document.addEventListener(name, function (e) { fn(e && e.detail); });
  }

  busOn("details-open", onDetailsOpen);
  busOn("details:open", onDetailsOpen);
  busOn("match-details", onDetailsOpen);

  busOn("match-selected-normalized", onMatchSelected);
  busOn("match-selected", onMatchSelected);

  // Expose API for MobileUI back button etc.
  window.DetailsModal = {
    open: function (m) { onDetailsOpen(m); },
    close: function () { closeModal(); },
    isOpen: function () { return isOpen(); }
  };
})();
