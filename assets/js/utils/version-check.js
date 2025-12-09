/* ============================================
   VERSION CHECK — STABLE VERSION
   ============================================ */

const CURRENT_VERSION = "2.2";

export function initVersionCheck() {
  const btn = document.getElementById("btn-update");
  if (!btn) return;

  btn.classList.add("hidden");

  async function check() {
    try {
      const res = await fetch("/version.json?ts=" + Date.now());
      const data = await res.json();

      if (data.version && data.version !== CURRENT_VERSION) {
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
