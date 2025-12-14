// matches-toggle.js
// Independent show/hide for panel-matches

export function initMatchesToggle() {
  const btn = document.getElementById("matches-toggle");
  const panel = document.getElementById("panel-matches");

  if (!btn || !panel) return;

  btn.addEventListener("click", () => {
    const isHidden = panel.classList.toggle("hidden");
    btn.classList.toggle("active", !isHidden);
  });
}
