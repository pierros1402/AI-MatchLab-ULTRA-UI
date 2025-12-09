/* ============================================================
   AI MATCHLAB ULTRA — ACCORDION.JS
   One-open system for left navigation
============================================================ */

// Exported function (app.js depends on this!)
export function openAccordion(targetId) {
  const items = document.querySelectorAll(".accordion-item");

  items.forEach((item) => {
    const header = item.querySelector(".accordion-header");
    const body = item.querySelector(".accordion-body");
    if (!header || !body) return;

    if (body.id === targetId) {
      body.style.display = "block";
      header.classList.add("active");
    } else {
      body.style.display = "none";
      header.classList.remove("active");
    }
  });
}

function initAccordion() {
  const headers = document.querySelectorAll(".accordion-header");

  headers.forEach((header) => {
    header.addEventListener("click", () => {
      const target = header.getAttribute("data-target");
      if (target) openAccordion(target);
    });
  });

  // Default open: continents
  if (document.getElementById("panel-continents")) {
    openAccordion("panel-continents");
  }
}

// INIT
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAccordion);
} else {
  initAccordion();
}
