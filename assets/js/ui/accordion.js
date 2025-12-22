// ======================================================================
// ACCORDION — AI MATCHLAB ULTRA
// v2.6: Single-open main flow + Autonomous Today/Saved + ALL CLOSED default
// ======================================================================

(function () {
  "use strict";

  const accordion = document.getElementById("left-accordion");
  if (!accordion) return;

  const AUTONOMOUS = new Set(["panel-today", "panel-saved"]);

  function qHeaders() {
    return accordion.querySelectorAll(".accordion-header");
  }
  function qPanels() {
    return accordion.querySelectorAll(".accordion-panel");
  }

  function setHeaderActive(id, on) {
    const h = accordion.querySelector(`.accordion-header[data-target="${id}"]`);
    if (!h) return;
    if (on) h.classList.add("active");
    else h.classList.remove("active");
  }

  function closePanel(id) {
    const p = document.getElementById(id);
    if (p) p.style.display = "none";
    setHeaderActive(id, false);
    if (window.emit) window.emit("accordion:closed", { id });
  }

  function openPanel(id) {
    const p = document.getElementById(id);
    if (p) p.style.display = "block";
    setHeaderActive(id, true);
    if (window.emit) window.emit("accordion:opened", { id });
  }

  function isOpen(id) {
    const p = document.getElementById(id);
    return !!(p && p.style.display !== "none" && p.offsetParent !== null);
  }

  function closeAllMainPanels() {
    // closes ONLY non-autonomous
    qPanels().forEach((p) => {
      if (!p || !p.id) return;
      if (AUTONOMOUS.has(p.id)) return;
      p.style.display = "none";
      setHeaderActive(p.id, false);
    });
  }

  function closeAllPanelsHard() {
    // closes everything (startup)
    qPanels().forEach((p) => {
      if (!p || !p.id) return;
      p.style.display = "none";
      setHeaderActive(p.id, false);
    });
  }

  function openAccordion(id) {
    if (!id) return;
    const panel = document.getElementById(id);
    if (!panel) return;

    const auto = AUTONOMOUS.has(id);

    // Toggle for autonomous panels
    if (auto) {
      const nowOpen = panel.style.display !== "none" && panel.offsetParent !== null;
      if (nowOpen) closePanel(id);
      else openPanel(id);
      return;
    }

    // Single-open for main flow
    closeAllMainPanels();
    openPanel(id);
  }

  // Global
  window.openAccordion = openAccordion;

  // Click binding (delegation)
  accordion.addEventListener("click", (e) => {
    const h = e.target && e.target.closest ? e.target.closest(".accordion-header") : null;
    if (!h) return;
    const targetId = h.getAttribute("data-target");
    if (targetId) openAccordion(targetId);
  });

  // ALL CLOSED default (hard)
  closeAllPanelsHard();

})();
