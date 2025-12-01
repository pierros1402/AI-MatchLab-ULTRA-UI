// ======================================================================
// AI MATCHLAB ULTRA — THEME MODULE (LIGHT + DARK)
// ======================================================================

export function initTheme() {
  const saved = localStorage.getItem("AIML_THEME");
  const initial =
    saved === "light" || saved === "dark" ? saved : "dark"; // dark default
  document.documentElement.className = initial;
  console.log("[Theme] Init:", initial);
}

export function toggleTheme() {
  const current = document.documentElement.className.includes("light")
    ? "light"
    : "dark";
  const next = current === "light" ? "dark" : "light";
  document.documentElement.className = next;
  localStorage.setItem("AIML_THEME", next);
  console.log("[Theme] Switch ->", next);
}
