/* ============================================
   INSTALL (PWA) HANDLER — STABLE VERSION
   ============================================ */

let deferredInstall = null;

export function initInstall() {
  const btn = document.getElementById("btn-install");
  if (!btn) return;

  // Hidden until browser triggers event
  btn.style.opacity = "0.4";
  btn.style.pointerEvents = "none";

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstall = e;

    btn.style.opacity = "1";
    btn.style.pointerEvents = "auto";
  });

  btn.addEventListener("click", () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    deferredInstall = null;
  });
}
