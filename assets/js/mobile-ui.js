/* ============================================================
   MOBILE UI SYSTEM — USER SELECTABLE MODE
   Drawer Mode / Vertical Mode
   ============================================================ */

const MOBILE_BREAKPOINT = 900; 
const MODE_KEY = "aiml_mobile_mode"; 

export function initMobileSystem() {
  if (window.innerWidth > MOBILE_BREAKPOINT) return; // Desktop = ignore mobile logic

  const btnMode = document.getElementById("btn-mobile-mode");
  if (!btnMode) return;

  // Load saved mode or default to drawer
  let mode = localStorage.getItem(MODE_KEY) || "drawer";
  applyMobileMode(mode);

  // Button opens mode selector
  btnMode.addEventListener("click", () => openModeSelector(mode));

  // Auto-update on resize (if shifting between mobile/desktop)
  window.addEventListener("resize", () => {
    if (window.innerWidth > MOBILE_BREAKPOINT) {
      resetMobileLayout();
    } else {
      applyMobileMode(localStorage.getItem(MODE_KEY) || "drawer");
    }
  });
}

/* ============================================================
   MODE SELECTOR POPUP
   ============================================================ */
function openModeSelector(current) {
  const wrapper = document.createElement("div");
  wrapper.className = "mobile-mode-wrapper";

  wrapper.innerHTML = `
    <div class="mobile-mode-modal">
      <h3>Select Mobile Layout</h3>

      <button class="mobile-option" data-mode="drawer">Drawer Navigation</button>
      <button class="mobile-option" data-mode="vertical">Vertical Navigation</button>

      <button class="mobile-close">Close</button>
    </div>
  `;

  document.body.appendChild(wrapper);

  wrapper.querySelectorAll(".mobile-option").forEach(btn => {
    btn.addEventListener("click", () => {
      const newMode = btn.dataset.mode;
      localStorage.setItem(MODE_KEY, newMode);
      applyMobileMode(newMode);
      wrapper.remove();
    });
  });

  wrapper.querySelector(".mobile-close").onclick = () => wrapper.remove();
  wrapper.onclick = e => { if (e.target === wrapper) wrapper.remove(); };
}

/* ============================================================
   APPLY MOBILE LAYOUT MODE
   ============================================================ */
function applyMobileMode(mode) {
  resetMobileLayout(); // Clean slate
  
  if (mode === "drawer") enableDrawerMode();
  if (mode === "vertical") enableVerticalMode();
}

/* ============================================================
   MODE: DRAWER
   ============================================================ */
function enableDrawerMode() {
  const leftPanel = document.querySelector(".left-column");
  const overlay = document.getElementById("drawer-overlay");
  const btnDrawer = document.getElementById("btn-drawer");

  if (!leftPanel || !overlay || !btnDrawer) return;

  btnDrawer.style.display = "inline-flex";

  btnDrawer.addEventListener("click", () => {
    leftPanel.classList.toggle("drawer-open");
    overlay.classList.toggle("visible");
  });

  overlay.addEventListener("click", () => {
    leftPanel.classList.remove("drawer-open");
    overlay.classList.remove("visible");
  });

  // Hide right panels for drawer mode
  hideRightPanels();
}

/* ============================================================
   MODE: VERTICAL STACK
   ============================================================ */
function enableVerticalMode() {
  showRightPanels();
  
  const layout = document.getElementById("app-layout");
  if (layout) {
    layout.classList.add("vertical-stack");
  }
}

/* ============================================================
   RESET MOBILE LAYOUT
   ============================================================ */
function resetMobileLayout() {
  const layout = document.getElementById("app-layout");
  if (layout) layout.classList.remove("vertical-stack");

  const leftPanel = document.querySelector(".left-column");
  const overlay = document.getElementById("drawer-overlay");
  if (leftPanel) leftPanel.classList.remove("drawer-open");
  if (overlay) overlay.classList.remove("visible");

  showRightPanels();
}

/* Helpers */
function hideRightPanels() {
  document.querySelectorAll(".right-column").forEach(col => col.style.display = "none");
}

function showRightPanels() {
  document.querySelectorAll(".right-column").forEach(col => col.style.display = "block");
}
