/* =========================================================
   AI MatchLab ULTRA — saved-store.js (STABLE MERGED)
   Combines old _dev logic + stable store:
   - Persists matches in localStorage (key aiml_saved_matches_v1)
   - Emits saved-updated event whenever list changes
   - Auto-loads on startup and exposes window.SavedStore
   - Instant sync with Saved panel + Matches ★ buttons
========================================================= */

(function () {
  "use strict";

  if (window.__AIML_SAVED_STORE__) return;
  window.__AIML_SAVED_STORE__ = true;

  const KEY = "aiml_saved_matches_v1";
  let _cache = [];

  // --- Utilities -------------------------------------------------------------
  function safeEmit(name, payload) {
    if (typeof window.emit === "function") {
      window.emit(name, payload);
    } else {
      try {
        document.dispatchEvent(new CustomEvent(name, { detail: payload }));
      } catch (e) {}
    }
  }

  function load() {
    try {
      const arr = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(arr)) {
        _cache = arr;
        return arr;
      }
    } catch (e) {}
    _cache = [];
    return [];
  }

  function persist(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      _cache = list;
    } catch (e) {
      console.warn("[SavedStore] Persist failed:", e);
    }
    safeEmit("saved-updated", { count: list.length, list });
  }

  function normalizeMatch(m) {
    if (!m) return null;
    const matchId = m.matchId || m.id || "";
    if (!matchId) return null;
    return {
      ...m,
      matchId,
      id: m.id || matchId,
      home: m.home || "",
      away: m.away || "",
      leagueName: m.leagueName || m.league || "",
      kickoff: m.kickoff || "",
      ts: Date.now()
    };
  }

  // --- Core API --------------------------------------------------------------
  function getAll() {
    return _cache.length ? [..._cache] : load();
  }

  function isSaved(matchId) {
    if (!matchId) return false;
    return _cache.some(x => (x.matchId || x.id) === matchId);
  }

  function toggle(matchObj) {
    const m = normalizeMatch(matchObj);
    if (!m) return false;

    const list = getAll();
    const idx = list.findIndex(x => (x.matchId || x.id) === m.matchId);

    if (idx >= 0) {
      list.splice(idx, 1);
      persist(list);
      return false;
    } else {
      list.unshift(m);
      persist(list);
      return true;
    }
  }

  function clearAll() {
    _cache = [];
    persist([]);
  }

  // --- Auto-sync between tabs / refresh --------------------------------------
  window.addEventListener("storage", (ev) => {
    if (ev.key === KEY) {
      load();
      safeEmit("saved-updated", { count: _cache.length, list: _cache });
    }
  });

  // --- Public API ------------------------------------------------------------
  window.SavedStore = {
    getAll,
    isSaved,
    toggle,
    clearAll
  };

  // --- Initialize cache on load ---------------------------------------------
  load();
  safeEmit("saved-updated", { count: _cache.length, list: _cache });

})();
