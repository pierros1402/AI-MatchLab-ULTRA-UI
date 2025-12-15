/* assets/js/ui/details-panel.js (STABLE)
   - Renders inline match details into #match-details-body
   - Button #btn-open-details-inline emits details-open (does not auto-open)
*/
(function () {
  "use strict";
  if (window.__AIML_DETAILS_INLINE__) return;
  window.__AIML_DETAILS_INLINE__ = true;

  var host = document.getElementById("match-details-body");
  var openBtn = document.getElementById("btn-open-details-inline");

  if (!host) return;

  var lastMatch = null;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderEmpty() {
    host.innerHTML = "Select a match to view details.";
  }

  function renderMatch(m) {
    if (!m || !m.id) { renderEmpty(); return; }

    var home = esc(m.home || m.homeName || "Home");
    var away = esc(m.away || m.awayName || "Away");
    var league = esc(m.leagueName || m.league || "");
    var ko = esc(m.kickoff || m.displayTime || "");

    host.innerHTML =
      '<div style="display:grid;gap:8px;">' +
        '<div style="font-weight:900;">' + home + " vs " + away + "</div>" +
        '<div style="opacity:.85;">' + league + (league && ko ? " • " : "") + ko + "</div>" +
        '<div style="opacity:.7;">Tap Open for full modal details.</div>' +
      "</div>";
  }

  // Wire Open button
  if (openBtn) {
    openBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (!lastMatch || !lastMatch.id) return;
      if (typeof window.emit === "function") window.emit("details-open", lastMatch);
      else document.dispatchEvent(new CustomEvent("details-open", { detail: lastMatch }));
    });
  }

  // Default state
  renderEmpty();

  // Listen to match-selected
  function busOn(name, fn) {
    if (typeof window.on === "function") window.on(name, fn);
    else document.addEventListener(name, function (e) { fn(e && e.detail); });
  }

  busOn("match-selected", function (m) {
    lastMatch = m || lastMatch;
    renderMatch(lastMatch);
  });

  busOn("match-selected-normalized", function (m) {
    lastMatch = m || lastMatch;
    renderMatch(lastMatch);
  });

  busOn("match-clear", function () {
    lastMatch = null;
    renderEmpty();
  });
})();
