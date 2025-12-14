/* ============================================================
   AI MatchLab ULTRA — version-check.js (GLOBAL, NO MODULES)
   - Fetches /version.json (no-cache)
   - Shows update banner if version changed
============================================================ */

(function () {
  "use strict";
  if (window.__AIML_VERSION_CHECK__) return;
  window.__AIML_VERSION_CHECK__ = true;

  const LS_VER = "aiml-last-version";

  function $(id) { return document.getElementById(id); }

  async function fetchVersion() {
    const res = await fetch("/version.json", { cache: "no-store" });
    if (!res.ok) throw new Error("version.json not reachable");
    return await res.json();
  }

  function showBanner() {
    const banner = $("update-banner");
    if (!banner) return;
    banner.classList.remove("hidden");

    const btn = $("btn-update-now");
    btn?.addEventListener("click", async () => {
      // best-effort cache clear
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {}
      location.reload(true);
    });
  }

  async function init() {
    try {
      const v = await fetchVersion();
      const current = String(v?.version || v?.v || "").trim();
      if (!current) return;

      let last = "";
      try { last = localStorage.getItem(LS_VER) || ""; } catch {}

      // Update topbar version label if exists
      const verEl = document.querySelector(".brand-version");
      if (verEl) verEl.textContent = current.startsWith("v") ? current : `v${current}`;

      if (last && last !== current) {
        showBanner();
      }

      try { localStorage.setItem(LS_VER, current); } catch {}
    } catch {
      // silent fail (offline/local)
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
