/* =========================================================
   saved-store.js — Global saved matches store
   ========================================================= */

(function () {
  const KEY = "AIML_SAVED_MATCHES";
  let saved = new Map();

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      raw.forEach(m => saved.set(m.id, m));
    } catch {}
  }

  function persist() {
    localStorage.setItem(KEY, JSON.stringify(Array.from(saved.values())));
  }

  load();

  window.on && window.on("save-toggle", (m) => {
    if (!m || !m.id) return;
    if (saved.has(m.id)) saved.delete(m.id);
    else saved.set(m.id, m);
    persist();
    window.emit && window.emit("saved:changed", Array.from(saved.values()));
  });

  window.getSavedMatches = () => Array.from(saved.values());
})();
