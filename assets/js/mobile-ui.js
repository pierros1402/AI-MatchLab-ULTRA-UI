/* ============================================
   MOBILE UI CONTROLLER (CURRENT UI)
   - Left panel as drawer on mobile
   - Optional Right panel as drawer (if btn-panels exists)
   ============================================ */

(function () {
  "use strict";

  function $(sel) { return document.querySelector(sel); }
  function on(el, ev, fn) { if (el) el.addEventListener(ev, fn, { passive: true }); }

  function isMobile() {
    return window.matchMedia && window.matchMedia("(max-width: 900px)").matches;
  }

  function setOverlayVisible(overlay, visible) {
    if (!overlay) return;
    overlay.classList.toggle("visible", !!visible);
  }

  function closeAll(leftPanel, rightPanel, overlay) {
    if (leftPanel) leftPanel.classList.remove("drawer-open");
    if (rightPanel) rightPanel.classList.remove("drawer-open");
    setOverlayVisible(overlay, false);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const leftPanel  = $("#left-panel");
    const rightPanel = $("#right-panel");
    const overlay    = $("#drawer-overlay");

    // Buttons (you will add #btn-drawer; #btn-panels is optional)
    const btnDrawer  = $("#btn-drawer");
    const btnPanels  = $("#btn-panels");

    // If overlay missing, do nothing (safe)
    if (!overlay) return;

    // LEFT drawer
    on(btnDrawer, "click", () => {
      if (!leftPanel) return;
      const open = !leftPanel.classList.contains("drawer-open");
      closeAll(leftPanel, rightPanel, overlay);
      if (open) {
        leftPanel.classList.add("drawer-open");
        setOverlayVisible(overlay, true);
      }
    });

    // RIGHT drawer (optional)
    on(btnPanels, "click", () => {
      if (!rightPanel) return;
      const open = !rightPanel.classList.contains("drawer-open");
      closeAll(leftPanel, rightPanel, overlay);
      if (open) {
        rightPanel.classList.add("drawer-open");
        setOverlayVisible(overlay, true);
      }
    });

    // Overlay click closes
    on(overlay, "click", () => closeAll(leftPanel, rightPanel, overlay));

    // ESC closes
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAll(leftPanel, rightPanel, overlay);
    });

    // If resize to desktop, ensure drawers closed
    window.addEventListener("resize", () => {
      if (!isMobile()) closeAll(leftPanel, rightPanel, overlay);
    });

    console.log("[mobile-ui] ready");
  });
})();
