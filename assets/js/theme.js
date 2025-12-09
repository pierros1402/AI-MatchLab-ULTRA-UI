// THEME ENGINE

// Load theme from storage or default to dark
export function initTheme() {
  let savedTheme = localStorage.getItem("aiml-theme");

  if (!savedTheme) {
    savedTheme = "dark";
    localStorage.setItem("aiml-theme", savedTheme);
  }

  applyTheme(savedTheme);
}

// Apply theme to document + icons
function applyTheme(theme) {
  const html = document.documentElement;
  const themeToggle = document.getElementById("theme-toggle");

  if (theme === "dark") {
    html.classList.add("dark");
    html.classList.remove("light");
    if (themeToggle) themeToggle.textContent = "🌙";
  } else {
    html.classList.add("light");
    html.classList.remove("dark");
    if (themeToggle) themeToggle.textContent = "☀️";
  }
}

// Toggle theme and store result
export function toggleTheme() {
  let current = localStorage.getItem("aiml-theme") || "dark";
  let next = current === "dark" ? "light" : "dark";

  localStorage.setItem("aiml-theme", next);
  applyTheme(next);
}
