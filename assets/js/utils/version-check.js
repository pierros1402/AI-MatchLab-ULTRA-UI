/* ===================================================================
   AI MATCHLAB — INLINE VERSION CHECKER (FINAL)
   Ελέγχει το version.json και εμφανίζει inline ειδοποίηση ενημέρωσης.
=================================================================== */

const VERSION_URL = "/version.json";
let currentVersion = null;

/* ---------------------------------------------------------------
   Έλεγχος version.json
--------------------------------------------------------------- */
export async function checkVersion() {
  try {
    const res = await fetch(VERSION_URL + "?t=" + Date.now());
    if (!res.ok) throw new Error("Version fetch failed");

    const data = await res.json();
    const newVersion = data.version;

    // First load → store current version
    if (!currentVersion) {
      currentVersion = newVersion;
      return;
    }

    // Version changed → show update notice
    if (newVersion !== currentVersion) {
      showInlineUpdateNotice(currentVersion, newVersion);
    }

  } catch (err) {
    console.error("VERSION CHECK ERROR:", err);
  }
}

/* ---------------------------------------------------------------
   Εμφάνιση inline κουμπιού + κειμένου
--------------------------------------------------------------- */
function showInlineUpdateNotice(oldVer, newVer) {
  const box = document.getElementById("update-inline-box");
  const btn = document.getElementById("btn-update-inline");
  const text = document.getElementById("update-inline-text");

  if (!box || !btn || !text) return;

  // Μήνυμα: New version · vA → vB
  text.textContent = `New version · v${oldVer} → v${newVer}`;

  // Εμφάνιση στοιχείων
  box.classList.remove("hidden");

  // Κουμπί Update
  btn.onclick = () => {
    location.reload(true);
  };
}

/* ---------------------------------------------------------------
   Auto-check every 60 seconds
--------------------------------------------------------------- */
export function startVersionAutoCheck() {
  checkVersion(); // First check
  setInterval(checkVersion, 60000);
}
