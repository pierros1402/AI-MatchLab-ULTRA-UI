/* ============================================
   MOBILE UI CONTROLLER (STABLE VERSION)
   ============================================ */

document.addEventListener("DOMContentLoaded", () => {

  // Left panel drawer toggle
  const drawerToggle = document.querySelector("#btn-drawer");
  const leftColumn = document.querySelector(".left-column");
  const overlay = document.querySelector("#drawer-overlay");

  if (drawerToggle && leftColumn && overlay) {
    drawerToggle.addEventListener("click", () => {
      leftColumn.classList.toggle("drawer-open");
      overlay.classList.toggle("visible");
    });

    overlay.addEventListener("click", () => {
      leftColumn.classList.remove("drawer-open");
      overlay.classList.remove("visible");
    });
  }

  // Safe check panels exist before modifying
  const livePanel    = document.querySelector("#panel-live");
  const radarPanel   = document.querySelector("#panel-radar");
  const smartPanel   = document.querySelector("#panel-smart");

  // Show all right panels by default (desktop)
  if (livePanel)  livePanel.style.display = "block";
  if (radarPanel) radarPanel.style.display = "block";
  if (smartPanel) smartPanel.style.display = "block";

  // Optional: add mobile collapse logic ONLY IF elements exist
  const mobileToggles = document.querySelectorAll("[data-mobile-toggle]");
  mobileToggles.forEach(btn => {
    const target = document.querySelector(btn.dataset.mobileToggle);
    if (!target) return;

    btn.addEventListener("click", () => {
      const visible = target.style.display === "block";
      target.style.display = visible ? "none" : "block";
    });
  });

});
