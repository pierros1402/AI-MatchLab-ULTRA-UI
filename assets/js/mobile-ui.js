/* assets/js/mobile-ui.js
   STABLE MOBILE NAV + DRAWER STATE
   - Adds body classes: drawer-left-open / drawer-right-open
   - Ensures overlay works with both .show and .visible
   - Home opens LEFT drawer (mobile home)
*/
(function () {
  "use strict";
  if (window.__AIML_MOBILE_UI__) return;
  window.__AIML_MOBILE_UI__ = true;

  function $(sel, root) { return (root || document).querySelector(sel); }

  var overlay = $("#drawer-overlay");
  var leftPanel = $("#left-panel");
  var rightPanel = $("#right-panel");

  var btnLeft  = $("#btn-drawer") || $("#btn-left-drawer");
  var btnRight = $("#btn-panels") || $("#btn-right-drawer");
  var btnHome  = $("#btn-home");
  var btnBack  = $("#btn-back");

  function isMobile() {
    return window.matchMedia && window.matchMedia("(max-width: 900px)").matches;
  }

  function isOpen(panelEl) {
    return !!(panelEl && panelEl.classList.contains("drawer-open"));
  }

  function setBodyState(state) {
    document.body.classList.remove("drawer-left-open", "drawer-right-open");
    if (state) document.body.classList.add(state);
  }

  function showOverlay() {
    if (!overlay) return;
    overlay.classList.add("visible");
    overlay.classList.add("show");   // support older CSS
    overlay.setAttribute("aria-hidden", "false");
  }

  function hideOverlay() {
    if (!overlay) return;
    overlay.classList.remove("visible");
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
  }

  function openLeft() {
    if (!leftPanel || !isMobile()) return;
    leftPanel.classList.add("drawer-open");
    if (rightPanel) rightPanel.classList.remove("drawer-open");
    setBodyState("drawer-left-open");
    showOverlay();
  }

  function openRight() {
    if (!rightPanel || !isMobile()) return;
    rightPanel.classList.add("drawer-open");
    if (leftPanel) leftPanel.classList.remove("drawer-open");
    setBodyState("drawer-right-open");
    showOverlay();
  }

  function closeDrawers() {
    if (leftPanel) leftPanel.classList.remove("drawer-open");
    if (rightPanel) rightPanel.classList.remove("drawer-open");
    setBodyState(null);
    hideOverlay();
  }

  function toggleLeft() {
    if (!isMobile()) return;
    if (isOpen(leftPanel)) closeDrawers();
    else openLeft();
  }

  function toggleRight() {
    if (!isMobile()) return;
    if (isOpen(rightPanel)) closeDrawers();
    else openRight();
  }

  // Accordion helpers (no modifications to accordion.js)
  function openAccordionSafe(targetId) {
    if (!targetId) return;
    if (typeof window.openAccordion === "function") {
      try { window.openAccordion(targetId); } catch (e) {}
      return;
    }
    var hdr = document.querySelector('#left-accordion .accordion-header[data-target="' + targetId + '"]');
    if (hdr) hdr.click();
  }

  // Details modal support (either id)
  function getDetailsModal() {
    return $("#match-details-modal") || $("#details-modal");
  }

  function isDetailsModalOpen() {
    var modal = getDetailsModal();
    if (!modal) return false;
    return !modal.classList.contains("hidden") || modal.getAttribute("aria-hidden") === "false";
  }

  function closeDetailsModalIfAny() {
    if (window.DetailsModal && typeof window.DetailsModal.close === "function") {
      try { window.DetailsModal.close(); return true; } catch (e) {}
    }
    var modal = getDetailsModal();
    if (!modal) return false;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    return true;
  }

  // Back/Home behavior
  function goHome() {
    closeDrawers();
    openAccordionSafe("panel-continents");
    if (isMobile()) openLeft();

    if (typeof window.emit === "function") {
      window.emit("home");
      window.emit("match-clear");
    }
  }

  function goBack() {
    if (isDetailsModalOpen()) { closeDetailsModalIfAny(); return; }
    if (isMobile() && (isOpen(leftPanel) || isOpen(rightPanel))) { closeDrawers(); return; }
    if (isMobile()) { openLeft(); }
  }

  // Wire buttons
  if (btnLeft)  btnLeft.addEventListener("click", function (e) { e.preventDefault(); toggleLeft(); });
  if (btnRight) btnRight.addEventListener("click", function (e) { e.preventDefault(); toggleRight(); });
  if (btnHome)  btnHome.addEventListener("click", function (e) { e.preventDefault(); goHome(); });
  if (btnBack)  btnBack.addEventListener("click", function (e) { e.preventDefault(); goBack(); });

  if (overlay) overlay.addEventListener("click", function () { closeDrawers(); });

  // Mobile Flow: after match-selected focus center (close drawer)
  if (typeof window.on === "function") {
    window.on("match-selected", function () {
      if (!isMobile()) return;
      closeDrawers();
    });
  }

  // Initial mobile home: open left drawer
  function initMobileHome() {
    if (!isMobile()) return;
    openAccordionSafe("panel-continents");
    openLeft();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMobileHome);
  } else {
    initMobileHome();
  }

  window.MobileUI = { openLeft: openLeft, openRight: openRight, closeDrawers: closeDrawers, home: goHome };
})();
