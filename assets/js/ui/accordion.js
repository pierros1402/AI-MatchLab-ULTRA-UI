// ======================================================================
// ACCORDION — AI MATCHLAB ULTRA (SINGLE OPEN + DEFAULT CONTINENTS)
// ======================================================================

(function () {
  "use strict";

  const accordion = document.getElementById("left-accordion");
  if (!accordion) return;

  const headers = accordion.querySelectorAll(".accordion-header");
  const panels = accordion.querySelectorAll(".accordion-panel");

  // close all panels
  function closeAll() {
    panels.forEach((p) => (p.style.display = "none"));
    headers.forEach((h) => h.classList.remove("active"));
  }

  // open panel by id
  function openAccordion(id) {
    closeAll();
    const panel = document.getElementById(id);
    const header = accordion.querySelector(`.accordion-header[data-target="${id}"]`);
    if (panel) panel.style.display = "block";
    if (header) header.classList.add("active");
  }

  // global
  window.openAccordion = openAccordion;

  // click binding
  headers.forEach((header) => {
    const targetId = header.getAttribute("data-target");
    header.addEventListener("click", () => openAccordion(targetId));
  });

  // default open continents
  openAccordion("panel-continents");

  // ======================================================================
  // PATCH: Ensure Saved panel is always clickable (in case loaded later)
  // ======================================================================
  document.addEventListener("DOMContentLoaded", () => {
    const savedHeader = document.querySelector('.accordion-header[data-target="panel-saved"]');
    if (savedHeader) {
      savedHeader.addEventListener("click", () => {
        window.openAccordion("panel-saved");
      });
    }
  });

})();
