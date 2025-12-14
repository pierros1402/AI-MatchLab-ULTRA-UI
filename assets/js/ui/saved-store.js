// ======================================================================
// SAVED STORE — AI MATCHLAB ULTRA (GLOBAL SCRIPT)
// Persists user's saved matches in localStorage
// ======================================================================

(function () {
  "use strict";

  const KEY = "aiml_saved_matches_v1";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  }

  function persist(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
    if (typeof emit === "function") emit("saved-updated", { count: list.length });
  }

  function normalizeMatch(m) {
    const matchId = m.matchId || m.id || "";
    return {
      ...m,
      matchId,                 // canonical
      id: m.id || matchId      // keep compatibility with existing panels
    };
  }

  function getAll() { return load(); }

  function isSaved(matchId) {
    return load().some(x => (x.matchId || x.id) === matchId);
  }

  function toggle(matchObj) {
    const m = normalizeMatch(matchObj);
    if (!m.matchId) return false;

    const list = load();
    const idx = list.findIndex(x => (x.matchId || x.id) === m.matchId);

    if (idx >= 0) list.splice(idx, 1);
    else list.unshift(m);

    persist(list);
    return idx < 0;
  }

  window.SavedStore = { getAll, isSaved, toggle };
})();
