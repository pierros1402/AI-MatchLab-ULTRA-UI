/* ============================================================
   DOM HELPERS — AI MATCHLAB ULTRA FINAL
============================================================ */

export function createElement(tag, className = "", content = "") {
  const el = document.createElement(tag);

  if (className) el.className = className;
  if (content) el.innerHTML = content;

  return el;
}
