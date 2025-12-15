/* assets/js/mobile-ui.js
   STABLE:
   - Mobile drawers (left/right) using existing IDs: btn-drawer / btn-panels
   - Global Back/Home works anywhere
   - Back closes details modal (match-details-modal)
*/
(function () {
  "use strict";
  if (window.__AIML_MOBILE_UI__) return;
  window.__AIML_MOBILE_UI__ = true;

  function $(sel, root) { return (root || document).querySelector(sel); }

  var overlay = $("#drawer-overlay");
  var leftPanel = $("#left-panel");
  var rightPanel = $("#right-panel");

  // Support both ID sets (your index uses btn-drawer / btn-panels)
  var btnLeft  = $("#btn-drawer") || $("#btn-left-drawer");
  var btnRight = $("#btn-panels") || $("#btn-right-drawer");

  var btnHome = $("#btn-home");
  var btnBack = $("#btn-back");

  function isMobile() {
    return window.matchMedia && window.matchMedia("(max-width: 899px)").matches;
  }

  function isOpen(panelEl) {
    if (!panelEl) return false;
    return panelEl.classList.contains("drawer-open");
  }

  function showOverlay() {
    if (!overlay) return;
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
  }

  function hideOverlayIfNoneOpen() {
    if (!overlay) return;
    if (isOpen(leftPanel) || isOpen(rightPanel)) return;
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
  }

  function openLeft() {
    if (!leftPanel) return;
    if (!isMobile()) return;
    leftPanel.classList.add("drawer-open");
    if (rightPanel) rightPanel.classList.remove("drawer-open");
    showOverlay();
  }

  function openRight() {
    if (!rightPanel) return;
    if (!isMobile()) return;
    rightPanel.classList.add("drawer-open");
    if (leftPanel) leftPanel.classList.remove("drawer-open");
    showOverlay();
  }

  function closeLeft() {
    if (leftPanel) leftPanel.classList.remove("drawer-open");
    hideOverlayIfNoneOpen();
  }

  function closeRight() {
    if (rightPanel) rightPanel.classList.remove("drawer-open");
    hideOverlayIfNoneOpen();
  }

  function closeDrawers() {
    if (leftPanel) leftPanel.classList.remove("drawer-open");
    if (rightPanel) rightPanel.classList.remove("drawer-open");
    hideOverlayIfNoneOpen();
  }

  function toggleLeft() {
    if (!isMobile()) return;
    if (isOpen(leftPanel)) closeLeft(); else openLeft();
  }

  function toggleRight() {
    if (!isMobile()) return;
    if (isOpen(rightPanel)) closeRight(); else openRight();
  }

  // Accordion helpers (no touching accordion.js)
  function getOpenAccordionTarget() {
    var acc = $("#left-accordion");
    if (!acc) return null;

    var hdr = acc.querySelector('.accordion-header[aria-expanded="true"]');
    if (hdr) return hdr.getAttribute("data-target");

    // fallback: try open item classes
    var openItem =
      acc.querySelector(".accordion-item.is-open") ||
      acc.querySelector(".accordion-item.open") ||
      acc.querySelector(".accordion-item.active");

    if (!openItem) return null;

    var header = openItem.querySelector(".accordion-header");
    return header ? header.getAttribute("data-target") : null;
  }

  function openAccordionSafe(targetId) {
    if (!targetId) return;
    if (typeof window.openAccordion === "function") {
      try { window.openAccordion(targetId); } catch (e) {}
      return;
    }
    var hdr = document.querySelector('#left-accordion .accordion-header[data-target="' + targetId + '"]');
    if (hdr) hdr.click();
  }

  // Your level chain (Saved → Today → Matches → Leagues → Countries → Continents)
  var LEVEL_UP = {
    "panel-saved": "panel-today",
    "panel-today": "panel-matches",
    "panel-matches": "panel-leagues",
    "panel-leagues": "panel-countries",
    "panel-countries": "panel-continents",
    "panel-continents": null
  };

  // Details modal (your index uses match-details-modal)
  function getDetailsModal() {
    return $("#match-details-modal") || $("#details-modal");
  }

  function isDetailsModalOpen() {
    var modal = getDetailsModal();
    if (!modal) return false;
    return !modal.classList.contains("hidden") || modal.getAttribute("aria-hidden") === "false";
  }

  function closeDetailsModal() {
    if (window.DetailsModal && typeof window.DetailsModal.close === "function") {
      try { window.DetailsModal.close(); return true; } catch (e) {}
    }
    var modal = getDetailsModal();
    if (!modal) return false;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    return true;
  }

  function goHome() {
    // Always reset navigation to Continents; on mobile also open left drawer
    closeDrawers();
    openAccordionSafe("panel-continents");

    if (isMobile()) openLeft();

    if (typeof window.emit === "function") {
      window.emit("home");
      window.emit("match-clear");
    }
  }

  function goBack() {
    // 1) close modal first
    if (isDetailsModalOpen()) {
      closeDetailsModal();
      return;
    }

    // 2) close drawers if open (mobile)
    if (isMobile()) {
      if (isOpen(rightPanel)) { closeRight(); return; }
      if (isOpen(leftPanel)) {
        // when left drawer open: go one level up
        var cur = getOpenAccordionTarget();
        var up = cur ? LEVEL_UP[cur] : "panel-continents";
        if (up) openAccordionSafe(up);
        else closeLeft();
        return;
      }
    }

    // 3) default: open left and go one level up
    var cur2 = getOpenAccordionTarget() || "panel-matches";
    var up2 = LEVEL_UP[cur2] || "panel-continents";
    openAccordionSafe(up2);

    if (isMobile()) openLeft();
  }

  // Wire buttons
  if (btnLeft) btnLeft.addEventListener("click", function (e) { e.preventDefault(); toggleLeft(); });
  if (btnRight) btnRight.addEventListener("click", function (e) { e.preventDefault(); toggleRight(); });
  if (btnHome) btnHome.addEventListener("click", function (e) { e.preventDefault(); goHome(); });
  if (btnBack) btnBack.addEventListener("click", function (e) { e.preventDefault(); goBack(); });

  // Overlay click closes drawers
  if (overlay) overlay.addEventListener("click", function () { closeDrawers(); });

  // Auto-close left drawer on match-selected (Mobile Flow v1)
  if (typeof window.on === "function") {
    window.on("match-selected", function () {
      if (isMobile()) closeLeft();
    });
  }

  // Expose API
  window.MobileUI = {
    openLeft: openLeft,
    openRight: openRight,
    closeDrawers: closeDrawers,
    back: goBack,
    home: goHome
  };
})();
