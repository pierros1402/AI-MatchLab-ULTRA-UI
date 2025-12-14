/* ============================================================
   AI MatchLab ULTRA — version-check.js (GLOBAL, NO MODULES)
   - Fetches /version.json (no-store + cache-bust)
   - Shows banner when remote > current UI version
   - NEVER auto-reloads; update happens ONLY on button click
============================================================ */

(function () {
  "use strict";
  if (window.__AIML_VERSION_CHECK__) return;
  window.__AIML_VERSION_CHECK__ = true;

  const LS_VER = "aiml-last-version";
  const CHECK_EVERY_MS = 5 * 60 * 1000;

  function $(id) { return document.getElementById(id); }

  function safeGetLS(key) {
    try { return localStorage.getItem(key) || ""; } catch { return ""; }
  }
  function safeSetLS(key, val) {
    try { localStorage.setItem(key, val); } catch {}
  }

  function parseVer(v) {
    const s = String(v || "").trim().replace(/^v/i, "");
    return s ? s.split(".").map(n => parseInt(n, 10) || 0) : [];
  }

  function isRemoteNewer(remote, current) {
    const a = parseVer(remote);
    const b = parseVer(current);
    const len = Math.max(a.length, b.length, 3);
    for (let i = 0; i < len; i++) {
      const x = a[i] || 0;
      const y = b[i] || 0;
      if (x > y) return true;
      if (x < y) return false;
    }
    return false;
  }

  function getCurrentUiVersion() {
    // Prefer the pill, because it is stable and doesn’t break layout.
    const pill = document.querySelector(".ver-pill");
    if (pill && pill.textContent) return pill.textContent.trim();
    // Fallback: from any element with [data-version]
    const dv = document.documentElement.getAttribute("data-version");
    return dv ? String(dv).trim() : "";
  }

  async function fetchRemoteVersion() {
    const url = "/version.json?t=" + Date.now();
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("version.json not reachable: " + res.status);
    const v = await res.json();
    const remote = String(v?.version || v?.v || "").trim();
    return remote.startsWith("v") ? remote : (remote ? `v${remote}` : "");
  }

  function showBanner(remoteVersion) {
    const banner = $("update-banner");
    if (!banner) return;

    banner.classList.remove("hidden");
    banner.dataset.nextVersion = remoteVersion || "";

    const btn = $("btn-update-now");
    if (!btn || btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", async () => {
      const next = banner.dataset.nextVersion || "";

      // Mark that the user accepted update (so next load won’t re-prompt)
      if (next) safeSetLS(LS_VER, next);

      // Best-effort cache clear
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
      } catch {}

      // Cache-busted reload (no deprecated reload(true))
      const u = new URL(location.href);
      u.searchParams.set("v", next || Date.now().toString());
      u.searchParams.set("t", Date.now().toString());
      location.replace(u.toString());
    });
  }

  function hideBanner() {
    const banner = $("update-banner");
    if (!banner) return;
    banner.classList.add("hidden");
    delete banner.dataset.nextVersion;
  }

  async function checkOnce() {
    try {
      const currentUi = getCurrentUiVersion();     // e.g. v2.3
      const remote = await fetchRemoteVersion();   // e.g. v2.4

      if (!remote) return;

      const last = safeGetLS(LS_VER);              // may be empty on mobile

      // Main rule: show banner when remote is newer than current UI version.
      if (currentUi && isRemoteNewer(remote, currentUi)) {
        showBanner(remote);
        return;
      }

      // Fallback rule (if current UI version missing): compare with last
      if (!currentUi && last && last !== remote) {
        showBanner(remote);
        return;
      }

      // Otherwise hide
      hideBanner();

      // If first run on device and current UI exists, persist it once
      if (!last && currentUi) safeSetLS(LS_VER, currentUi);
    } catch {
      // silent fail (offline/local)
    }
  }

  function init() {
    checkOnce();
    setInterval(checkOnce, CHECK_EVERY_MS);
    console.log("[version-check] ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
