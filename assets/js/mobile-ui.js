/* ============================================
   MOBILE UI CONTROLLER — Mobile Flow v1
   Goals:
   1) Mobile "Home" opens LEFT drawer (accordion)
   2) On match-selected => close drawers to show center odds
   3) Scroll to Active Match Bar after selection (mobile)
   4) Close drawers on details-open too
   5) Hamburger hidden only while "home" drawer is open;
      if user closes overlay, hamburger returns
============================================ */

(function () {
  "use strict";

  function $(sel) { return document.querySelector(sel); }
  function isMobile() {
    return window.matchMedia && window.matchMedia("(max-width: 900px)").matches;
  }

  function setOverlayVisible(overlay, visible) {
    if (!overlay) return;
    overlay.classList.toggle("visible", !!visible);
  }

  function setHomeLeftState(enabled) {
    document.body.classList.toggle("mobile-home-left-open", !!enabled);
  }

  function closeAll(leftPanel, rightPanel, overlay) {
    if (leftPanel) leftPanel.classList.remove("drawer-open");
    if (rightPanel) rightPanel.classList.remove("drawer-open");
    setOverlayVisible(overlay, false);
    setHomeLeftState(false);
  }

  function openLeft(leftPanel, rightPanel, overlay, asHome) {
    if (!leftPanel) return;
    closeAll(leftPanel, rightPanel, overlay);
    leftPanel.classList.add("drawer-open");
    setOverlayVisible(overlay, true);
    setHomeLeftState(!!asHome);
  }

  function openRight(leftPanel, rightPanel, overlay) {
    if (!rightPanel) return;
    closeAll(leftPanel, rightPanel, overlay);
    rightPanel.classList.add("drawer-open");
    setOverlayVisible(overlay, true);
  }

  function bindBus(eventName, handler) {
    if (typeof window.on === "function") {
      window.on(eventName, handler);
      return;
    }
    document.addEventListener(eventName, function (e) {
      handler(e && e.detail);
    });
  }

  function focusCenterOnSelection() {
    // On mobile, after selection, ensure the user sees the match context + odds
    const amb = document.getElementById("active-match-bar");
    if (amb && typeof amb.scrollIntoView === "function") {
      amb.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const center = document.getElementById("center-panel");
    if (center && typeof center.scrollIntoView === "function") {
      center.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const leftPanel  = $("#left-panel");
    const rightPanel = $("#right-panel");
    const overlay    = $("#drawer-overlay");

    const btnDrawer  = $("#btn-drawer");
    const btnPanels  = $("#btn-panels");

    if (!overlay) return;

    // Manual LEFT drawer toggle (not "home" mode)
    if (btnDrawer) {
      btnDrawer.addEventListener("click", () => {
        if (!leftPanel) return;
        const open = !leftPanel.classList.contains("drawer-open");
        if (open) openLeft(leftPanel, rightPanel, overlay, false);
        else closeAll(leftPanel, rightPanel, overlay);
      });
    }

    // RIGHT drawer toggle (optional)
    if (btnPanels) {
      btnPanels.addEventListener("click", () => {
        if (!rightPanel) return;
        const open = !rightPanel.classList.contains("drawer-open");
        if (open) openRight(leftPanel, rightPanel, overlay);
        else closeAll(leftPanel, rightPanel, overlay);
      });
    }

    // Overlay click closes everything (and exits "home" state)
    overlay.addEventListener("click", () => closeAll(leftPanel, rightPanel, overlay));

    // ESC closes
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAll(leftPanel, rightPanel, overlay);
    });

    // Mobile home: open LEFT drawer on first load
    if (isMobile()) {
      openLeft(leftPanel, rightPanel, overlay, true);
    }

    // When user selects a match => close drawers & focus center odds
    bindBus("match-selected", () => {
      if (!isMobile()) return;
      closeAll(leftPanel, rightPanel, overlay);
      setTimeout(focusCenterOnSelection, 80);
    });

    // When details opens => close drawers too (so modal/center is visible)
    bindBus("details-open", () => {
      if (!isMobile()) return;
      closeAll(leftPanel, rightPanel, overlay);
    });
    bindBus("details:open", () => {
      if (!isMobile()) return;
      closeAll(leftPanel, rightPanel, overlay);
    });

    // If resize to desktop, ensure drawers closed + home flag off
    window.addEventListener("resize", () => {
      if (!isMobile()) closeAll(leftPanel, rightPanel, overlay);
    });

    console.log("[mobile-ui] Mobile Flow v1 ready");
  });
})();
