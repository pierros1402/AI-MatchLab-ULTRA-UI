/* ============================================
   VERSION CHECK — FINAL CLEAN VERSION
============================================ */

export function initVersionCheck() {
  const btn = document.getElementById("btn-update");
  if (!btn) return;

  // Read current version from UI subtitle
  const subtitle = document.querySelector(".app-subtitle");
  const currentVersion = subtitle
    ? subtitle.textContent.trim().split(" ")[0].replace("v", "")
    : "0.0.0";

  async function check() {
    try {
      const res = await fetch("/version.json?ts=" + Date.now());
      const remote = await res.json();

      if (remote.version && remote.version !== currentVersion) {
        btn.classList.remove("hidden");
        btn.onclick = () => location.reload(true);
      }
    } catch (err) {
      console.warn("Version check failed:", err);
    }
  }

  check();
  setInterval(check, 20000);
}
