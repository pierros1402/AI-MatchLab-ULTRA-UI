/* ===================================================================
   AI MATCHLAB — VERSION CHECKER (FINAL)
   Ελέγχει το version.json και ειδοποιεί όταν υπάρχει νέα έκδοση.
=================================================================== */

const VERSION_URL = "/version.json";
let currentVersion = null;

/* ---------------------------------------------------------------
   Κύρια συνάρτηση
--------------------------------------------------------------- */
export async function checkVersion() {
  try {
    const res = await fetch(VERSION_URL + "?t=" + Date.now());
    if (!res.ok) throw new Error("Version fetch failed");

    const data = await res.json();
    const newVersion = data.version;

    if (!currentVersion) {
      currentVersion = newVersion;
      console.log("Version loaded:", newVersion);
      return;
    }

    if (newVersion !== currentVersion) {
      showUpdateBanner(newVersion);
    }
  } catch (err) {
    console.error("VERSION CHECK ERROR:", err);
  }
}

/* ---------------------------------------------------------------
   Εμφάνιση banner ενημέρωσης
--------------------------------------------------------------- */
function showUpdateBanner(newVer) {
  const banner = document.createElement("div");
  banner.className = "update-banner";

  banner.innerHTML = `
    <div class="update-content">
      <b>Νέα έκδοση διαθέσιμη!</b><br>
      (v${newVer})
    </div>
    <button class="update-btn" onclick="location.reload(true)">
      Refresh
    </button>
  `;

  document.body.appendChild(banner);
}

/* ---------------------------------------------------------------
   Auto-check κάθε 60 δευτερόλεπτα
--------------------------------------------------------------- */
export function startVersionAutoCheck() {
  checkVersion(); // first check
  setInterval(checkVersion, 60000);
}
